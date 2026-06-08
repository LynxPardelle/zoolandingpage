import { NgModule } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import testProviders from './test-providers';

const ensureStylesheetLink = (href: string): void => {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

ensureStylesheetLink('/css/animations.css');
ensureStylesheetLink('/css/angora-styles.css');
ensureStylesheetLink('/css/angora-styles-responsive.css');

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
