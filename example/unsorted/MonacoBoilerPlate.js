import * as React from 'react';
import * as monaco from 'monaco-editor';
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import debounce from 'lodash/debounce';
import './Editor.css';


type Props = {
  files: { [path: string]: string },
path: string,
  value: string,
  onOpenPath: (path: string) => mixed,
  onValueChange: (value: string) => mixed,
  lineNumbers?: 'on' | 'off',
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded',
  scrollBeyondLastLine?: boolean,
  minimap?: {
    enabled?: boolean,
    maxColumn?: number,
    renderCharacters?: boolean,
    showSlider?: 'always' | 'mouseover',
    side?: 'right' | 'left',
  },
  theme: 'ayu-light' | 'ayu-dark',
};

// Store editor states such as cursor position, selection and scroll position for each model
const editorStates = new Map();
// Store details about typings we have loaded
const extraLibs = new Map();

const codeEditorService = StaticServices.codeEditorService.get();

// const findModel = (path) => monaco.editor.getModels().find(model => model.uri.path === `/${path}`);

export default class Editor extends React.Component {
  static defaultProps = {
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    minimap: {
      enabled: false,
    },
    theme: 'ayu-light',
  };


  componentDidMount() {
    const { path, value, ...rest } = this.props;

    this._editor = monaco.editor.create(
      this._node,
      rest,
      Object.assign(codeEditorService, {
        openCodeEditor: ({ resource, options }, editor) => {
          this.props.onOpenPath(resource.path.replace(/^\//, ''));
          editor.setSelection(options.selection);
          editor.revealLine(options.selection.startLineNumber);
          return Promise.resolve({
            getControl: () => editor,
          });
        },
      })
    );

    // Object.keys(this.props.files).forEach(path =>
    //   this._initializeFile(path, this.props.files[path])
    // );

    this._openFile(path, value);
  }


  clearSelection() {
    const selection = this._editor.getSelection();
    this._editor.setSelection(
      new monaco.Selection(
        selection.startLineNumber,
        selection.startColumn,
        selection.startLineNumber,
        selection.startColumn
      )
    );
  }


  render() {
    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={c => (this._phantom = c)}
          type="text/html"
          style={{
            display: 'block',
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: '100%',
            pointerEvents: 'none',
            opacity: 0,
          }}
        />
        <div
          ref={c => (this._node = c)}
          style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
          className={this.props.theme}
        />
      </div>
    );
  }
}
