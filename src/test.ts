import { NgModule } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import testProviders from './test-providers';
import { restoreTestBrowserHistory, setTestBrowserUrl } from './test-browser-state';

@NgModule({
  providers: testProviders,
})
class ZonelessTestModule {}

getTestBed().initTestEnvironment(
  [BrowserTestingModule, ZonelessTestModule],
  platformBrowserTesting(),
  {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
);

const initialTestUrl = `${ window.location.pathname }${ window.location.search }${ window.location.hash }`;

beforeEach(() => {
  restoreTestBrowserHistory();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.cookie = 'zlp_lang=; Path=/; Max-Age=0; SameSite=Lax';
});

afterEach(async () => {
  getTestBed().resetTestingModule();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  restoreTestBrowserHistory();
  setTestBrowserUrl(initialTestUrl);
});
