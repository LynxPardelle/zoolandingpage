import {
  CLIENT_NAVIGATION_START_EVENT,
  currentBrowserPath,
  navigateInCurrentWindow,
} from './browser-navigation.utility';
import { setTestBrowserUrl } from '@/test-browser-state';

describe('browser navigation utility', () => {
  beforeEach(() => {
    setTestBrowserUrl('/current?draftDomain=zoositioweb.com.mx');
    expect(currentBrowserPath()).toBe('/current?draftDomain=zoositioweb.com.mx');
  });

  afterEach(() => {
    setTestBrowserUrl('/context.html');
  });

  it('dispatches a client navigation start event before same-origin popstate refresh', () => {
    const events: string[] = [];
    const startListener = () => events.push('start');
    const popstateListener = () => events.push('popstate');

    window.addEventListener(CLIENT_NAVIGATION_START_EVENT, startListener);
    window.addEventListener('popstate', popstateListener);

    try {
      navigateInCurrentWindow('/registro?draftDomain=zoositioweb.com.mx');
    } finally {
      window.removeEventListener(CLIENT_NAVIGATION_START_EVENT, startListener);
      window.removeEventListener('popstate', popstateListener);
    }

    expect(currentBrowserPath()).toBe('/registro?draftDomain=zoositioweb.com.mx');
    expect(events).toEqual(['start', 'popstate']);
  });

  it('does not dispatch a start event when navigating to the current path', () => {
    const startListener = jasmine.createSpy('startListener');
    window.addEventListener(CLIENT_NAVIGATION_START_EVENT, startListener);

    try {
      navigateInCurrentWindow('/current?draftDomain=zoositioweb.com.mx');
    } finally {
      window.removeEventListener(CLIENT_NAVIGATION_START_EVENT, startListener);
    }

    expect(startListener).not.toHaveBeenCalled();
  });
});
