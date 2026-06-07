import { CLIENT_BOOTSTRAP_DELAY_MS, CLIENT_BOOTSTRAP_READY_EVENT, STATIC_BOOT_CURTAIN_FALLBACK_MS } from './client-bootstrap.constants';

describe('client bootstrap constants', () => {
  it('defers client bootstrap until after load so SSR content owns the first paint', () => {
    expect(CLIENT_BOOTSTRAP_DELAY_MS).toBe(3000);
    expect(CLIENT_BOOTSTRAP_READY_EVENT).toBe('load');
    expect(STATIC_BOOT_CURTAIN_FALLBACK_MS).toBe(2500);
  });
});
