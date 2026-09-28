import { TestBed } from '@angular/core/testing';
import { ProtectedOriginService } from '../../shared/services/protected-origin.service';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { ProtectedAuthorAuthService } from './protected-author-auth.service';
describe('ProtectedAuthorAuthService',()=>{
  let service:ProtectedAuthorAuthService, fetcher:jasmine.Spy;
  const origin='https://admin.example.test';
  const trusted={origin,context:{origin,domain:'example.test',originRole:'protected-admin'}};
  beforeEach(()=>{
    TestBed.configureTestingModule({providers:[{provide:ProtectedOriginService,useValue:trusted},
      {provide:RuntimeConfigService,useValue:{authRemote:()=>({requiredOrigin:origin}),auth:()=>({allowedGroups:['owner'],session:{csrfCookieName:'zlp_csrf_fixture',challengeCsrfCookieName:'zlp_challenge_csrf_fixture',mfaEnrollCsrfCookieName:'zlp_mfa_enroll_csrf_fixture'}})}}]});
    fetcher=spyOn(globalThis,'fetch').and.resolveTo(new Response(JSON.stringify({ok:true,status:'signed-in',account:{accountPurpose:'client-owner',roles:['owner']},session:{idleExpiresAt:Date.now()/1000+600,absoluteExpiresAt:Date.now()/1000+3600}})));
    service=TestBed.inject(ProtectedAuthorAuthService);
    document.cookie='zlp_mfa_enroll_csrf_fixture=fixture; path=/';
  });
  afterEach(()=>{TestBed.resetTestingModule();document.cookie='zlp_mfa_enroll_csrf_fixture=; Max-Age=0; path=/';trusted.origin=origin;});
  it('uses the minimal v2 session without inventing or persisting a subject',async()=>{
    expect(await service.session()).toBeTrue();
    expect(fetcher.calls.mostRecent().args[0]).toBe('/auth-v2/session/me');
  });
  it('uses enrollment CSRF for setup verification, not the consumed challenge cookie',async()=>{
    await service.submit('verify',{code:'123456'});
    const [url,options]=fetcher.calls.mostRecent().args;
    expect(url).toBe('/auth-v2/session/mfa/verify');
    expect(options.headers['X-ZLP-CSRF']).toBe('fixture');
  });
  it('denies wrong origins and unsupported signup without any request',async()=>{
    trusted.origin='https://public.example.test';
    expect(await service.session()).toBeFalse();
    await expectAsync(service.submit('signup',{})).toBeRejected();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
