import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, REQUEST, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { isExactHttpsOrigin, isProtectedAssetMap, type ProtectedOriginContext } from '../utility/auth/protected-admin-origin.utility';
import { parseSsrRequestUrl } from '../utility/request/ssr-request-url.utility';
const KEY = makeStateKey<ProtectedOriginContext | null>('zlp-protected-origin');
@Injectable({providedIn:'root'})
export class ProtectedOriginService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly request = inject(REQUEST, {optional:true});
  private readonly supplied = inject(REQUEST_CONTEXT, {optional:true}) as {protectedOrigin?: ProtectedOriginContext} | null;
  private readonly transfer = inject(TransferState);
  readonly context: ProtectedOriginContext | null = this.resolve();
  get origin(): string { return this.browser ? window.location.origin : parseSsrRequestUrl(this.request)?.origin ?? ''; }
  assetUrl(value: string): string {
    const assets=this.context?.assetUrls;
    return assets && Object.prototype.hasOwnProperty.call(assets,value)?assets[value]:value;
  }
  private resolve(): ProtectedOriginContext | null {
    const value = this.browser ? this.transfer.get(KEY,null) : this.supplied?.protectedOrigin;
    const url = this.browser ? new URL(window.location.href) : parseSsrRequestUrl(this.request);
    if (!value || value.originRole !== 'protected-admin' || !isExactHttpsOrigin(value.origin)
      || value.origin !== url?.origin || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value.domain)
      || (value.assetUrls!==undefined&&!isProtectedAssetMap(value.assetUrls))
      || [...(url?.searchParams.keys() ?? [])].some(k => /^(draftDomain|draftPageId|debugWorkspace)(=|$)/i.test(k))) return null;
    const safe: ProtectedOriginContext = {origin:value.origin,domain:value.domain,originRole:'protected-admin',...(value.assetUrls?{assetUrls:{...value.assetUrls}}:{})};
    if (!this.browser) this.transfer.set(KEY,safe);
    return safe;
  }
}
