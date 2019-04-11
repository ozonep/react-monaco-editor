import {editor} from "monaco-editor";
import PropTypes from "prop-types";
import React, { useEffect, useRef } from "react";

const noop = () => {};
const processSize = size => (/^\d+$/.test(size) ? `${size}px` : size);

let monaco;
let monacoModel;

function MonacoEditor({ width, height, ...props }) {
  const containerElement = useRef(null);
  let preventTriggerChangeEvent = false;

  const editorDidMount = monaco => {
    props.editorDidMount(monaco);
    monaco.onDidChangeModelContent(event => {
      const value = monaco.getValue();
      if (!preventTriggerChangeEvent) {
        props.onChange(value, event, monaco);
      }
    });
  };

  const initMonaco = () => {
    console.log("initMonaco1", monaco);
    const value = props.value !== null ? props.value : props.defaultValue;
    const { language, theme, options } = props;
    if (containerElement.current) {
      monaco = editor.create(containerElement.current, {
        value,
        language,
        ...options
      });
      monacoModel = monaco.getModel();
      if (theme) editor.setTheme(theme);
      editorDidMount(monaco);
    }
  };

  const destroyMonaco = () => {
    if (typeof monaco !== "undefined") {
      monaco.dispose();
    }
  };

  useEffect(() => {
    initMonaco();
    return () => destroyMonaco();
  }, []);

  useEffect(
      () => {
        if (monaco) {
          preventTriggerChangeEvent = true;
          // monacoModel.setValue(props.value);
          preventTriggerChangeEvent = false;
        }
      },
      [props.value]
  );

  useEffect(
      () => {
        editor.setModelLanguage(monaco.getModel(), props.language);
      },
      [props.language]
  );

  useEffect(
      () => {
        editor.setTheme(props.theme);
      },
      [props.theme]
  );

  useEffect(
      () => {
        if (monaco) monaco.updateOptions(props.options);
      },
      [props.options]
  );

  useEffect(
      () => {
        if (monaco) monaco.layout();
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
