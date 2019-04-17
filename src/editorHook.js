import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import PropTypes from "prop-types";
import React, { useEffect, useRef } from "react";
import {processSize} from "./utils";

const noop = () => {};

let editor = null;
let data = {
  javascript: {
    model: null,
    state: null
  },
  css: {
    model: null,
    state: null
  },
  html: {
    model: null,
    state: null
  },
  python: {
    model: null,
    state: null
  }
};

function MonacoEditor(props) {
  const containerElement = useRef(null);
  let preventTriggerChangeEvent = false;
  const { language, theme, options, width, height } = props;
  let value = props.value !== null ? props.value : props.defaultValue;

  const updateDimensions = () => {
    editor.layout();
  };

  const editorDidMount = model => {
    window.addEventListener("resize", updateDimensions);
    props.editorDidMount(model);
    editor.onDidChangeModelContent(event => {
      const value = model.getValue();
      if (!preventTriggerChangeEvent) {
        props.onChange(value, event, model);
      }
    });
  };

  const initMonaco = () => {
    if (containerElement.current) {
      editor = monaco.editor.create(containerElement.current, {
        model: null,
        ...options
      });
      data[language].model = monaco.editor.createModel(value, language);
      editor.setModel(data[language].model);
      if (theme) monaco.editor.setTheme(theme);
      editorDidMount(data[language].model);
    }
  };

  const destroyMonaco = () => {
    if (typeof editor !== "undefined") {
      window.removeEventListener("resize", updateDimensions);
      editor.dispose();
    }
  };

  useEffect(() => {
    initMonaco();
    return () => destroyMonaco();
  }, []);

  useEffect(() => {
        if (data[language].model) {
          preventTriggerChangeEvent = true;
          data[language].model.pushEditOperations(
              [],
              [
                {
                  range: data[language].model.getFullModelRange(),
                  text: value,
                },
              ]
          );
          preventTriggerChangeEvent = false;
        }
      },
      [value]
  );

  useEffect(() => {
    let currentState = editor.saveViewState();
    let currentModel = editor.getModel();
    if (currentModel === data.javascript.model) {
      data.javascript.state = currentState;
    } else if (currentModel === data.css.model) {
      data.css.state = currentState;
    } else if (currentModel === data.html.model) {
      data.html.state = currentState;
    } else if (currentModel === data.python.model) {
      data.python.state = currentState;
    }
    if (!data[language].model) data[language].model = monaco.editor.createModel(value, language);
    editor.setModel(data[language].model);
    editor.restoreViewState(data[language].state);
    editor.focus();
    props.editorDidMount(data[language].model);
    },
      [language]
  );

  useEffect(() => {
        monaco.editor.setTheme(props.theme);
      },
      [theme]
  );

  useEffect(
      () => {
        if (editor) editor.updateOptions(props.options);
      },
      [options]
  );

  useEffect(() => {
        if (editor) editor.layout();
      },
      [width, height]
  );


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
