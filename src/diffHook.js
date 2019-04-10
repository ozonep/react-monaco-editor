import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import React, {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';

const noop = () => { };
const processSize = size => /^\d+$/.test(size) ? `${size}px` : size;

function MonacoDiffEditor({width, height, ...props}) {
    const containerElement = useRef(undefined);
    let editor;
    let prevent_trigger_change_event;

    useEffect(() => {
        initMonaco();
        return () => destroyMonaco();
    },[]);

    useEffect(() => {
        if (editor) {
            prevent_trigger_change_event = true;
            updateModel(props.value, props.original);
            prevent_trigger_change_event = false;
        }
    }, [props.value, props.original]);

    useEffect(() => {
        const { original, modified } = editor.getModel();
        monaco.editor.setModelLanguage(original, props.language);
        monaco.editor.setModelLanguage(modified, props.language);
    }, [props.language]);

    useEffect(() => {
        monaco.editor.setTheme(props.theme);
    }, [props.theme]);

    useEffect(() => {
        editor.updateOptions(props.options)
    }, [props.options]);

    useEffect(() => {
        if (editor) editor.layout();
    }, [width, height]);

    const editorWillMount = () => {
        const options = props.editorWillMount(monaco);
        return options || {};
    };

    const editorDidMount = (editor) =>  {
        props.editorDidMount(editor, monaco);
        editor.onDidUpdateDiff(() => {
            const value = editor.getModel().modified.getValue();
            if (!prevent_trigger_change_event) {
                props.onChange(value);
            }
        });
    };

    const updateModel = (value, original) => {
        const originalModel = monaco.editor.createModel(original, props.language);
        const modifiedModel = monaco.editor.createModel(value, props.language);
        editor.setModel({
            original: originalModel,
            modified: modifiedModel
        });
    };

    const initMonaco = () => {
        const value = props.value !== null ? props.value : props.defaultValue;
        const { original, theme, options } = props;
        if (containerElement.current) {
            editorWillMount();
            editor = monaco.editor.createDiffEditor(containerElement.current, options);
            if (theme) monaco.editor.setTheme(theme);
            updateModel(value, original);
            editorDidMount(this.editor);
        }
    };

    const destroyMonaco = () => {
        if (typeof editor !== 'undefined') editor.dispose();
    };

    const style = {
        width: processSize(width),
        height: processSize(height)
    };
    return <div ref={containerElement} style={style} className="react-monaco-editor-container" />;
}

MonacoDiffEditor.propTypes = {
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    original: PropTypes.string,
    value: PropTypes.string,
    defaultValue: PropTypes.string,
    language: PropTypes.string,
    theme: PropTypes.string,
    options: PropTypes.object,
    editorDidMount: PropTypes.func,
    editorWillMount: PropTypes.func,
    onChange: PropTypes.func
};

MonacoDiffEditor.defaultProps = {
    width: '100%',
    height: '100%',
    original: null,
    value: null,
    defaultValue: '',
    language: 'javascript',
    theme: null,
    options: {},
    editorDidMount: noop,
    editorWillMount: noop,
    onChange: noop
};

export default MonacoDiffEditor;
