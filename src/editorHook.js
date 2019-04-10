import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import PropTypes from "prop-types";
import React, { useEffect, useRef } from "react";

const noop = () => {};
const processSize = size => (/^\d+$/.test(size) ? `${size}px` : size);

function MonacoEditor({ width, height, ...props }) {
  const containerElement = useRef(null);
  let editor = {};
  let preventTriggerChangeEvent = false;

  const editorWillMount = () => {
    const options = props.editorWillMount(monaco);
    return options || {};
  };

  const editorDidMount = editor => {
    props.editorDidMount(editor, monaco);
    editor.onDidChangeModelContent(event => {
      const value = editor.getValue();
      if (!preventTriggerChangeEvent) {
        props.onChange(value, event);
      }
    });
  };

  const initMonaco = () => {
    const value = props.value !== null ? props.value : props.defaultValue;
    const { language, theme, options } = props;
    if (containerElement.current) {
      Object.assign(options, editorWillMount());
      editor = monaco.editor.create(containerElement.current, {
        value,
        language,
        ...options
      });
      if (theme) monaco.editor.setTheme(theme);
      editorDidMount(editor);
    }
  };

  const destroyMonaco = () => {
    if (typeof editor !== "undefined") {
      editor.dispose();
    }
  };

  useEffect(() => {
    initMonaco();
    return () => destroyMonaco();
  }, []);

  useEffect(
    () => {
      if (editor) {
        preventTriggerChangeEvent = true;
        editor.setValue(props.value);
        preventTriggerChangeEvent = false;
      }
    },
    [props.value]
  );

  useEffect(
    () => {
      monaco.editor.setModelLanguage(editor.getModel(), props.language);
    },
    [props.language]
  );

  useEffect(
    () => {
      monaco.editor.setTheme(props.theme);
    },
    [props.theme]
  );

  useEffect(
    () => {
      editor.updateOptions(props.options);
    },
    [props.options]
  );

  useEffect(
    () => {
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
  editorWillMount: PropTypes.func,
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
  editorWillMount: noop,
  onChange: noop
};

export default MonacoEditor;
