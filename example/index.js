/* eslint-disable */
import React from 'react';
import ReactDOM from 'react-dom';
import {MonacoEditor, MonacoDiffEditor} from 'react-monaco-hooks';


class CodeEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      code: '// type your code... \n',
    }
  }

  onChange = (newValue, e) => {
    console.log('onChange', newValue, e); // eslint-disable-line no-console
  }

  editorDidMount = (editor) => {
    // eslint-disable-next-line no-console
    console.log('editorDidMount', editor, editor.getValue(), editor.getModel());
    this.editor = editor;
  }

  changeEditorValue = () => {
    if (this.editor) {
      this.editor.setValue('// code changed! \n');
    }
  }

  changeBySetState = () => {
    this.setState({ code: '// code changed by setState! \n' });
  }

  render() {
    const { code } = this.state;
    const options = {
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: 'line',
      automaticLayout: false,
    };
    return (
      <div>
        <div>
          <button onClick={this.changeEditorValue} type="button">Change value</button>
          <button onClick={this.changeBySetState} type="button">Change by setState</button>
        </div>
        <hr />
        <MonacoEditor
          height="500"
          language="javascript"
          value={code}
          options={options}
          onChange={this.onChange}
          editorDidMount={this.editorDidMount}
        />
      </div>
    );
  }
}

class AnotherEditor extends React.Component { // eslint-disable-line react/no-multi-comp
  constructor(props) {
    super(props);
    const jsonCode = [
      '{',
      '    "$schema": "http://myserver/foo-schema.json"',
      '}'
    ].join('\n');
    this.state = {
      code: jsonCode,
    }
  }

  editorWillMount = (monaco) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        uri: 'http://myserver/foo-schema.json',
        schema: {
          type: 'object',
          properties: {
            p1: {
              enum: [ 'v1', 'v2']
            },
            p2: {
              $ref: 'http://myserver/bar-schema.json'
            }
          }
        }
      }, {
        uri: 'http://myserver/bar-schema.json',
        schema: {
          type: 'object',
          properties: {
            q1: {
              enum: [ 'x1', 'x2']
            }
          }
        }
      }]
    });
  }

  render() {
    const { code } = this.state;
    return (
      <div>
        <MonacoDiffEditor
          width="800"
          height="600"
          language="json"
          defaultValue={code}
          theme="vs-dark"
          editorWillMount={this.editorWillMount}
        />
      </div>
    );
  }
}

const App = () => (
  <div>
    <h2>Monaco Editor Sample (controlled mode)</h2>
    <CodeEditor />
    <hr />
    <h2>Another editor (uncontrolled mode)</h2>
    <AnotherEditor />
  </div>
)

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
