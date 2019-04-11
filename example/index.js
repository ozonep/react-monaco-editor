/* eslint-disable */
import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import MonacoEditor from 'react-monaco-hooks';

let editor;

function CodeEditor(props) {
 const [code, setCode] = useState('// type your code... \n');
 const [theme, setTheme] = useState('vs-dark');

 const onChange = (newValue, e, monaco) => {
   console.log('onChange', newValue, e);
   setCode(newValue);
   editor = monaco;
 };

  const editorDidMount = (monaco) => {
    console.log('editorDidMount', monaco.getValue());
    editor = monaco;
  };

  const changeEditorValue = () => {
    if (editor) editor.setValue('// code changed! \n');
  };

  const changeBySetState = () => {
      setCode('// code changed by setState! \n');
  };

  const changeTheme = () => {
      setTheme('vs');
  };

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
          <button onClick={changeEditorValue} type="button">Change value</button>
          <button onClick={changeBySetState} type="button">Change by setState</button>
            <button onClick={changeTheme} type="button">Change theme</button>
        </div>
        <hr />
        <MonacoEditor
          height="700"
          language="javascript"
          value={code}
          options={options}
          onChange={onChange}
          theme={theme}
          editorDidMount={editorDidMount}
        />
      </div>
    );
}

// function AnotherEditor(props) {
//   const code1 = "// your original code...";
//   const code2 = "// a different version...";
//   return (
//       <div>
//         <MonacoDiffEditor
//           width="800"
//           height="600"
//           language="javascript"
//           theme="vs-dark"
//           original={code1}
//           value={code2}
//         />
//       </div>
//     );
// }

const App = () => (
  <div>
    <h2>Monaco Editor Sample (controlled mode)</h2>
    <CodeEditor />
    <hr />
    {/*<h2>Another editor (uncontrolled mode)</h2>*/}
    {/*<AnotherEditor />*/}
  </div>
);

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
