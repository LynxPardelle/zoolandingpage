import { provideZonelessChangeDetection } from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';

const testAngoraCombos: Record<string, string[]> = {};

const collectRenderedDomClasses = (root?: ParentNode): string[] => {
  const target = root ?? document;
  return Array.from(target.querySelectorAll?.('[class]') ?? [])
    .flatMap((element) => Array.from(element.classList))
    .filter((className, index, classes) => className.length > 0 && classes.indexOf(className) === index);
};

const testNgxAngoraService: Record<string, unknown> = {
  indicatorClass: 'ank',
  abreviationsClasses: {},
  combos: testAngoraCombos,
  getCombos: () => testAngoraCombos,
  pushCombos: (combos: Record<string, string[]>) => {
    Object.assign(testAngoraCombos, combos);
  },
  runInCssCreateBatch: (callback: () => void) => callback(),
  cssCreate: () => undefined,
  collectRenderedDomClasses,
  hasGeneratedCssRules: () => false,
  waitForCssReady: () => Promise.resolve(false),
  isComboClass: (className: string) => Object.prototype.hasOwnProperty.call(testAngoraCombos, className),
  classifyClass: (className: string) => {
    const comboKey = Object.prototype.hasOwnProperty.call(testAngoraCombos, className) ? className : undefined;
    return {
      kind: comboKey ? 'combo' : 'utility',
      managed: className.startsWith('ank-') || comboKey !== undefined,
      comboKey,
    };
  },
  auditManagedStylesheets: () => ({ totalRules: 0 }),
  getCssCreateDebugSummary: () => ({ totalCreatedClasses: 0, totalRules: 0 }),
  getCssCreateHistory: () => [],
  getCssCreateDebugSnapshot: () => ({ history: [], stylesheets: [] }),
  clearCssCreateHistory: () => undefined,
  pushColors: () => undefined,
  updateColors: () => undefined,
  updateClasses: () => undefined,
};

export default [
  provideZonelessChangeDetection(),
  { provide: NgxAngoraService, useValue: testNgxAngoraService as unknown as NgxAngoraService },
];
