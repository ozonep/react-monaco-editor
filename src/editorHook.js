// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main';
import PropTypes from "prop-types";
import React, { useEffect, useRef } from "react";
import {processSize, prettierCode} from "./utils";

const noop = () => {};

let editor = null;

monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true,
});

const documentFormattingProvider = {
  async provideDocumentFormattingEdits(model) {
    const text = await prettierCode(model.uri.path, model.getValue());
    return [
      {
        range: model.getFullModelRange(),
        text,
      },
    ];
  },
};
monaco.languages.registerDocumentFormattingEditProvider('javascript', documentFormattingProvider);
monaco.languages.registerDocumentFormattingEditProvider('typescript', documentFormattingProvider);
monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

const compilerOptions = {
  allowJs: true,
  allowSyntheticDefaultImports: true,
  alwaysStrict: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  isolatedModules: true,
  jsx: monaco.languages.typescript.JsxEmit.React,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  noEmit: true,
  resolveJsonModule: true,
  strict: true,
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  // paths: {
  //   '*': ['*'],
  // },
};
monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

const findModel = (path) => monaco.editor.getModels().find(model => model.uri.path === `/${path}`);
const editorStates = new Map();
const extraLibs = new Map();

const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};



function MonacoEditor(props) {
  const containerElement = useRef(null);
  const { language, options, width, height, path } = props;
  let value = props.value !== null ? props.value : props.defaultValue;
  let linterWorker;
  let typingsWorker;
  let subscription;

  const updateDimensions = () => {
    editor.layout();
  };

  const removePath = (path) => {
    editorStates.delete(path);
    const model = findModel(path);
    model && model.dispose();
  };

  const renamePath = (oldPath, newPath) => {
    const selection = editorStates.get(oldPath);
    editorStates.delete(oldPath);
    editorStates.set(newPath, selection);
    removePath(oldPath);
  };

  const editorDidMount = model => {
    window.addEventListener("resize", updateDimensions);
    props.editorDidMount(model);
    subscription = editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model) {
        const value = model.getValue();
        if (value !== props.value) {
          props.onChange(value, model);
        }
        lintCode(value);
      }
    });
  };

  const updateMarkers = ({ markers, version }) => {
      const model = editor.getModel();
      if (model && model.getVersionId() === version) monaco.editor.setModelMarkers(model, 'eslint', markers);
  };

  const lintCode = code => {
    const model = editor.getModel();
    if (model.getModeId() === 'javascript') {
      monaco.editor.setModelMarkers(model, 'eslint', []);
      linterWorker.postMessage({
        code,
        version: model.getVersionId(),
      });
    }
  };

  const initMonaco = () => {
    linterWorker = new Worker('./workers/eslint.worker.js');
    linterWorker.addEventListener('message', ({ data }) => updateMarkers(data));
    typingsWorker = new Worker('./workers/typings.worker.js');
    typingsWorker.addEventListener('message', ({ data }) => addTypings(data));
    typingsWorker.postMessage({
      name: 'react',
      version: '16.8.6'
    });
    if (containerElement.current) {
      editor = monaco.editor.create(containerElement.current, {
        model: null,
        ...options
      });
      initializeFile(path, value);
      // data[language].model = monaco.editor.createModel(value, language);
      // editor.setModel(data[language].model);
      // if (theme) monaco.editor.setTheme(theme);
      editorDidMount(data[language].model);
    }
  };

  const destroyMonaco = () => {
    if (typeof editor !== "undefined") {
      window.removeEventListener("resize", updateDimensions);
      linterWorker && linterWorker.terminate();
      typingsWorker && typingsWorker.terminate();
      subscription && subscription.dispose();
      editor.dispose();
    }
  };

  const initializeFile = (path, value) => {
    let model = findModel(path);
    if (model && !model.isDisposed()) {
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: value,
          },
        ]
      );
    } else {
      model = monaco.editor.createModel(
        value,
        undefined,
        monaco.Uri.from({ scheme: 'file', path })
      );
      model.updateOptions({
        tabSize: 2,
        insertSpaces: true,
      });
    }
  };

  subscription = editor.onDidChangeModelContent(() => {
    const model = editor.getModel();
    if (model) {
      const value = model.getValue();
      if (value !== props.value) {
        props.onValueChange(value);
      }
      lintCode(value);
    }
  });

  const addTypings = ({ typings }) => {
    Object.keys(typings).forEach(path => {
      let extraLib = extraLibs.get(path);
      if (extraLib) {
        extraLib.js.dispose();
        extraLib.ts.dispose();
      }
      extraLib = monaco.languages.typescript.javascriptDefaults.addExtraLib(
        typings[path],
        monaco.Uri.from({ scheme: 'file', path }).toString()
      );
      extraLibs.set(path, extraLib);
    });
  };

  const openFile = (path, value) => {
    initializeFile(path, value);
    const model = findModel(path);
    if (editor && model) {
      editor.setModel(model);
      const editorState = editorStates.get(path);
      if (editorState) editor.restoreViewState(editorState);
      editor.focus();
    }
  };

  useEffect(() => {
    initMonaco();
    return () => destroyMonaco();
  }, []);

  useEffect(() => {
        if (editor) {
          const model = editor.getModel();
          editor.executeEdits(null, [
            {
              range: model.getFullModelRange(),
              text: value,
            },
          ]);
        }
      },
      [value]
  );

  useEffect(() => {
      const prevPath = usePrevious(path);
      editorStates.set(prevPath, editor.saveViewState());
      openFile(path, value);
    },
    [path]
  );

  useEffect(() => {
        if (editor) editor.updateOptions(props.options);
      },
      [options]
  );

  useEffect(() => {
        if (editor) editor.layout();
      },
      [width, height]
  );

  // useEffect(() => {
  //   let currentState = editor.saveViewState();
  //   let currentModel = editor.getModel();
  //   if (currentModel === data.javascript.model) {
  //     data.javascript.state = currentState;
  //   } else if (currentModel === data.css.model) {
  //     data.css.state = currentState;
  //   } else if (currentModel === data.html.model) {
  //     data.html.state = currentState;
  //   } else if (currentModel === data.python.model) {
  //     data.python.state = currentState;
  //   }
  //   if (!data[language].model) data[language].model = monaco.editor.createModel(value, language);
  //   editor.setModel(data[language].model);
  //   editor.restoreViewState(data[language].state);
  //   editor.focus();
  //   props.editorDidMount(data[language].model);
  //   },
  //     [language]
  // );

  // useEffect(() => {
  //       monaco.editor.setTheme(props.theme);
  //     },
  //     [theme]
  // );

  const style = {
    width: processSize(width),
    height: processSize(height)
  };
  return (
    <div
      ref={containerElement}
      style={style}
      className="react-monaco-editor-container"
    />
  );
}

MonacoEditor.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  language: PropTypes.string,
  theme: PropTypes.string,
  options: PropTypes.object,
  editorDidMount: PropTypes.func,
  onChange: PropTypes.func
};

MonacoEditor.defaultProps = {
  width: "100%",
  height: "100%",
  value: null,
  defaultValue: "",
  language: "javascript",
  theme: null,
  options: {},
  editorDidMount: noop,
  onChange: noop
};

export default MonacoEditor;
