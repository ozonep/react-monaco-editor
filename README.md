<p align="center"><img src="https://user-images.githubusercontent.com/2723376/55211710-2f76e000-5228-11e9-887b-67faca78c4b9.png" width="150" height="150" /></p>

<h1 align="center">react-monaco-hooks</h1>

<div align="center">

[Monaco Editor](https://github.com/Microsoft/monaco-editor) for React.

<h4 align="center">Based on "react-monaco-editor"</h4>


[![react-monaco-editor](https://nodei.co/npm/react-monaco-hooks.png)](https://npmjs.org/package/react-monaco-hooks)

[npm-url]: https://npmjs.org/package/react-monaco-hooks
[downloads-image]: http://img.shields.io/npm/dm/react-monaco-editor.svg
[npm-image]: http://img.shields.io/npm/v/react-monaco-editor.svg

</div>

## Examples

To build the examples locally, run:

```bash
yarn
cd example
yarn
yarn start
```

Then open `http://localhost:8886` in a browser.

## Installation

```bash
yarn add react-monaco-hooks
```

## Using with Webpack

```js
import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import MonacoEditor from 'react-monaco-hooks';

function App(props) {
  const [code, setCode] = useState('// type your code...');
   
  const editorDidMount = (editor, monaco) => {
    console.log('editorDidMount', editor);
    editor.focus();
  };
  
  const onChange = (newValue, e) => {
    console.log('onChange', newValue, e);
  };
  
  const options = {
    selectOnLineNumbers: true
  };
  
  return (
    <MonacoEditor
      width="800"
      height="600"
      language="javascript"
      theme="vs-dark"
      value={code}
      options={options}
      onChange={onChange}
      editorDidMount={editorDidMount}
    />
   );
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
```

Add the [Monaco Webpack plugin](https://github.com/Microsoft/monaco-editor-webpack-plugin) `monaco-editor-webpack-plugin` to your `webpack.config.js`:

```js
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
module.exports = {
  plugins: [
    new MonacoWebpackPlugin({
      // available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: ['json']
    })
  ]
};
```

Sidenote: Monaco Editor uses CSS imports internally, so if you're using CSS Modules in your project - you're likely to get conflict by default. In order to avoid that - separate css-loader for app and monaco-editor package:

```js
// Specify separate paths
const path = require('path');
const APP_DIR = path.resolve(__dirname, './src');
const MONACO_DIR = path.resolve(__dirname, './node_modules/monaco-editor');

{
  test: /\.css$/,
  include: APP_DIR,
  use: [{
    loader: 'style-loader',
  }, {
    loader: 'css-loader',
    options: {
      modules: true,
      namedExport: true,
    },
  }],
}, {
  test: /\.css$/,
  include: MONACO_DIR,
  use: ['style-loader', 'css-loader'],
}
```

## Properties

All the properties below are optional.

- `width` width of editor. Defaults to `100%`.
- `height` height of editor. Defaults to `100%`.
- `value` value of the auto created model in the editor.
- `defaultValue` the initial value of the auto created model in the editor.
- `language` the initial language of the auto created model in the editor.
- `theme` the theme of the editor
- `options` refer to [Monaco interface IEditorConstructionOptions](https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.ieditorconstructionoptions.html).
- `onChange(newValue, event)` an event emitted when the content of the current model has changed.
- `editorWillMount(monaco)` an event emitted before the editor mounted (similar to `componentWillMount` of React).
- `editorDidMount(editor, monaco)` an event emitted when the editor has been mounted (similar to `componentDidMount` of React).
- `context` allow to pass a different context then the global window onto which the monaco instance will be loaded. Useful if you want to load the editor in an iframe.

## Events & Methods

Refer to [Monaco interface IEditor](https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.ieditor.html).

## Q & A

### I don't get syntax highlighting / autocomplete / validation.

Make sure to use the [Monaco Webpack plugin](https://github.com/Microsoft/monaco-editor-webpack-plugin) or follow the [instructions on how to load the ESM version of Monaco](https://github.com/Microsoft/monaco-editor/blob/master/docs/integrate-esm.md).

### How to interact with the MonacoEditor instance

Using the first parameter of `editorDidMount`, or using a `ref` (e.g. `<MonacoEditor ref="monaco">`) after `editorDidMount` event has fired.

Then you can invoke instance methods via `this.refs.monaco.editor`, e.g. `this.refs.monaco.editor.focus()` to focuses the MonacoEditor instance.

### How to get value of editor

Using `this.refs.monaco.editor.getValue()` or via method of `Model` instance:

```js
const model = this.refs.monaco.editor.getModel();
const value = model.getValue();
```

### Do something before editor mounted

For example, you may want to configure some JSON schemas before editor mounted, then you can go with `editorWillMount(monaco)`:

```js
function App(props) {
    const editorWillMount = (monaco) => {
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            schemas: [{
                uri: "http://myserver/foo-schema.json",
                schema: {
                    type: "object",
                    properties: {
                        p1: {
                            enum: [ "v1", "v2"]
                        },
                        p2: {
                            $ref: "http://myserver/bar-schema.json"
                        }
                    }
                }
            }]
        });
    }
    return <MonacoEditor language="json" editorWillMount={editorWillMount} />;
}
```

### Available (built-in) themes:
```
"vs",
"vs-dark",
"hc-black"
```
[More themes can be found here](https://www.npmjs.com/package/monaco-themes)


### How to use the diff editor

```js
import React from 'react';
import { MonacoDiffEditor } from 'react-monaco-hooks';

function App(props) {
    const code1 = "// your original code...";
    const code2 = "// a different version...";
    const options = {
      //renderSideBySide: false
    };
    return (
      <MonacoDiffEditor
        width="800"
        height="600"
        language="javascript"
        original={code1}
        value={code2}
        options={options}
      />
    );
}
```