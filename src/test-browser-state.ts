type TTestBrowserHistoryOriginals = {
  readonly pushState: History['pushState'];
  readonly replaceState: History['replaceState'];
};

const testGlobal = globalThis as typeof globalThis & {
  __zlpTestBrowserHistoryOriginals__?: TTestBrowserHistoryOriginals;
};
const nativeHistory = testGlobal.__zlpTestBrowserHistoryOriginals__ ?? {
  pushState: History.prototype.pushState,
  replaceState: History.prototype.replaceState,
};
testGlobal.__zlpTestBrowserHistoryOriginals__ = nativeHistory;

export const restoreTestBrowserHistory = (): void => {
  Object.defineProperty(window.history, 'pushState', {
    configurable: true,
    writable: true,
    value: nativeHistory.pushState.bind(window.history),
  });
  Object.defineProperty(window.history, 'replaceState', {
    configurable: true,
    writable: true,
    value: nativeHistory.replaceState.bind(window.history),
  });
};

export const setTestBrowserUrl = (href: string): void => {
  const url = new URL(href, window.location.origin);
  const nextPath = `${ url.pathname }${ url.search }${ url.hash }`;
  const currentPath = `${ window.location.pathname }${ window.location.search }${ window.location.hash }`;
  if (nextPath === currentPath) {
    return;
  }
  nativeHistory.replaceState.call(window.history, {}, '', nextPath);
};
