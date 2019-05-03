export const debounce = (fn, time) => {
    let timeout;
    return function () {
        const functionCall = () => fn.apply(this, arguments);
        clearTimeout(timeout);
        timeout = setTimeout(functionCall, time);
    }
};

export const processSize = size => (/^\d+$/.test(size) ? `${size}px` : size);



function getFileLanguage(path=undefined) {
  if (path.includes('.')) {
    switch (path.split('.').pop()) {
      case 'js':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'py':
        return 'python';
      default:
        return undefined;
    }
  }
  return undefined;
}



export async function prettierCode(path, code) {
  const language = getFileLanguage(path);
  let parser;
  let plugins;
  switch (language) {
    case 'javascript':
      parser = 'babel';
      plugins = [await import('prettier/parser-babylon')];
      break;
    case 'typescript':
      parser = 'typescript';
      plugins = [await import('prettier/parser-typescript')];
      break;
    default:
      break;
  }
  if (parser && plugins) {
    const prettier = await import('prettier/standalone');
    const { default: config } = await import('./config/prettier.json');
    return prettier.format(code, {
      parser,
      plugins,
      ...config,
    });
  }
  return code;
}
