import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import PropTypes from 'prop-types';
import React, {useEffect, useRef} from 'react';
import { processSize } from './utils';

function noop() { }

function MonacoEditor({width, height, ...props}) {
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
            editor.setValue(props.value);
            prevent_trigger_change_event = false;
        }
    }, [props.value]);

    useEffect(() => {
        monaco.editor.setModelLanguage(editor.getModel(), props.language);
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


    const destroyMonaco = () => {
        if (typeof editor !== 'undefined') {
            this.editor.dispose();
        }
    };

    const initMonaco = () => {
        const value = props.value !== null ? props.value : props.defaultValue;
        const { language, theme, options } = props;
        if (containerElement.current) {
            Object.assign(options, editorWillMount());
            this.editor = monaco.editor.create(containerElement.current, {
                value,
                language,
                ...options
            });
            if (theme) monaco.editor.setTheme(theme);
            editorDidMount(editor);
        }
    };

    const editorWillMount = () => {
        const options = props.editorWillMount(monaco);
        return options || {};
    };

    const editorDidMount = (editor) =>  {
        props.editorDidMount(editor, monaco);
        editor.onDidChangeModelContent((event) => {
            const value = editor.getValue();
            if (!prevent_trigger_change_event) {
                props.onChange(value, event);
            }
        });
    };

    const fixedWidth = processSize(width);
    const fixedHeight = processSize(height);
    const style = {
        width: fixedWidth,
        height: fixedHeight
    };
    return <div ref={containerElement} style={style} className="react-monaco-editor-container" />;
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
    width: '100%',
    height: '100%',
    value: null,
    defaultValue: '',
    language: 'javascript',
    theme: null,
    options: {},
    editorDidMount: noop,
    editorWillMount: noop,
    onChange: noop
};

export default MonacoEditor;
