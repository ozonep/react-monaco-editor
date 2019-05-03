import * as React from 'react';
import { StyleSheet, css } from 'aphrodite';
import classnames from 'classnames';
import debounce from 'lodash/debounce';
import mapValues from 'lodash/mapValues';
import { preloadedModules } from 'snack-sdk';
import * as monaco from 'monaco-editor';
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import overrides from './themes/monaco-overrides';
import withThemeName from '../Preferences/withThemeName';
import ResizeDetector from '../shared/ResizeDetector';
import prettierCode from '../../utils/prettierCode';
import getRelativePath from '../../utils/getRelativePath';
import getFileLanguage from '../../utils/getFileLanguage';



// Store editor states such as cursor position, selection and scroll position for each model
const editorStates = new Map();

// Store details about typings we have requested and loaded
const requestedTypings = new Map();
const extraLibs = new Map();

const codeEditorService = StaticServices.codeEditorService.get();



class MonacoEditor extends React.Component {
  static defaultProps = {
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    minimap: {
      enabled: false,
    },
    fontFamily: 'var(--font-monospace)',
    fontLigatures: true,
  };

  static removePath(path) {
    // Remove editor states
    editorStates.delete(path);
    // Remove associated models
    const model = findModel(path);
    model && model.dispose();
  }

  static renamePath(oldPath, newPath) {
    const selection = editorStates.get(oldPath);
    editorStates.delete(oldPath);
    editorStates.set(newPath, selection);
    this.removePath(oldPath);
  }

  componentDidMount() {


    const { path, value, annotations, autoFocus, ...rest } = this.props;

    // The methods provided by the service are on it's prototype
    // So spreading this object doesn't work, we must mutate it
    codeEditorService.openCodeEditor = async ({ resource, options }, editor) => {
      // Remove the leading slash added by the Uri
      await this.props.onOpenPath(resource.path.replace(/^\//, ''));
      editor.setSelection(options.selection);
      editor.revealLine(options.selection.startLineNumber);
      return {
        getControl: () => editor,
      };
    };

    const editor = monaco.editor.create(
      this._node.current,
      rest,
      codeEditorService
    );

    this._subscription = editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model) {
        const value = model.getValue();
        if (value !== this.props.value) {
          this.props.onValueChange(value);
        }
      }
    });

    this._editor = editor;

    this._openFile(path, value, autoFocus);
    this._updateMarkers(annotations);
    this._fetchTypings(this.props.dependencies, this.props.sdkVersion);

    // Load all the files so the editor can provide proper intellisense
    this.props.entries.forEach(({ item }) => {
      if (
        item.type === 'file' &&
        item.path !== path &&
        !item.asset &&
        typeof item.content === 'string'
      ) {
        this._initializeFile(item.path, item.content);
      }
    });


  componentDidUpdate(prevProps) {
    const { path, value, mode, annotations, dependencies, sdkVersion, autoFocus, theme, ...rest } = this.props;
    if (this._editor) {
      this._editor.updateOptions(rest);
      const model = this._editor.getModel();
      if (path !== prevProps.path) {
        // Save the editor state for the previous file so we can restore it when it's re-opened
        editorStates.set(prevProps.path, this._editor.saveViewState());
        this._openFile(path, value, autoFocus);
      } else if (model && value !== model.getValue()) {
        this._editor.executeEdits(null, [
          {
            range: model.getFullModelRange(),
            text: value,
          },
        ]);
      }
    }

    if (annotations !== prevProps.annotations) {
      this._updateMarkers(annotations);
    }

    if (dependencies !== prevProps.dependencies || sdkVersion !== prevProps.sdkVersion) {
      this._fetchTypings(dependencies, sdkVersion);
    }

    if (theme !== prevProps.theme) {
      // Update the global editor theme
      // Monaco doesn't have a way to change theme locally
      monaco.editor.setTheme(theme);
    }

    if (this.props.entries !== prevProps.entries) {
      // Update all changed entries for updated intellisense
      this.props.entries.forEach(({ item }) => {
        if (item.type === 'file' && !item.asset && item.path !== path) {
          const previous = prevProps.entries.find(e => e.item.path === item.path);
          if (previous && previous.item.content === item.content) {
            return;
          }
          this._initializeFile(item.path, item.content);
        }
      });
    }
  }

  componentWillUnmount() {
    this._subscription && this._subscription.dispose();
    this._editor && this._editor.dispose();
    this._hoverProviderJS && this._hoverProviderJS.dispose();
    this._hoverProviderTS && this._hoverProviderTS.dispose();
    this._completionProviderJS && this._completionProviderJS.dispose();
    this._completionProviderTS && this._completionProviderTS.dispose();
    this._typingsWorker && this._typingsWorker.terminate();
  }

  _initializeFile = (path, value) => {
    let model = findModel(path);

    if (model && !model.isDisposed()) {
      // If a model exists, we need to update it's value
      // This is needed because the content for the file might have been modified externally
      // Use `pushEditOperations` instead of `setValue` or `applyEdits` to preserve undo stack
      // @ts-ignore
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


  _getAllDependencies = (dependencies, sdkVersion) => ({
    ...mapValues(preloadedModules.dependencies[sdkVersion], version => ({ version })),
    ...dependencies,
  });

  _fetchTypings = (dependencies, sdkVersion) => {
    const deps = this._getAllDependencies(dependencies, sdkVersion);
    Object.keys(deps).forEach(qualifier => {
      const { version } = deps[qualifier];
      // Parse the qualifier to get the package name
      // This will handle qualifiers with deep imports
      const match = /^(?:@([^/?]+)\/)?([^@/?]+)(?:\/([^@]+))?/.exec(qualifier);
      if (!match) {
        return;
      }
      const name = (match[1] ? `@${match[1]}/` : '') + match[2];
      if (requestedTypings.get(name) === version) {
        // Typing already loaded
        return;
      }

      requestedTypings.set(name, version);
      this._typingsWorker &&
        this._typingsWorker.postMessage({
          name,
          version,
        });
    });
  };

  _addTypings = ({ typings }) => {
    Object.keys(typings).forEach(path => {
      const extraLib = extraLibs.get(path);
      if (extraLib) {
        extraLib.js.dispose();
        extraLib.ts.dispose();
      }
      const uri = monaco.Uri.from({ scheme: 'file', path }).toString();
      const js = monaco.languages.typescript.javascriptDefaults.addExtraLib(typings[path], uri);
      const ts = monaco.languages.typescript.typescriptDefaults.addExtraLib(typings[path], uri);
      extraLibs.set(path, { js, ts });
    });
  };

  _updateMarkers = (annotations) =>
    monaco.editor.setModelMarkers(this._editor.getModel(), null, annotations);

  _handleResize = debounce(() => this._editor && this._editor.layout(), 50, {
    leading: true,
    trailing: true,
  });

  _node = React.createRef();
  _statusbar = React.createRef();

  render() {
    return (
      <div className={css(styles.container)}>
        <style type="text/css" dangerouslySetInnerHTML={{ __html: overrides }} />
        <ResizeDetector onResize={this._handleResize}>
          <div
            ref={this._node}
            className={classnames(
              css(styles.editor),
              'snack-monaco-editor',
              `theme-${this.props.theme}`
            )}
          />
        </ResizeDetector>
      </div>
    );
  }
}

export default withThemeName(MonacoEditor);

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
  },
  editor: {
    height: '100%',
    width: '100%',
  },
});
