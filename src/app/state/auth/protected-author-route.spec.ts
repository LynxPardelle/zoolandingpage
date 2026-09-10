import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { ProtectedOriginService } from '../../shared/services/protected-origin.service';
import { AuthRuntimeService } from './auth-runtime.service';
import { AuthFacade } from './auth.facade';
import { AuthAdminClientService } from './auth-admin-client.service';
import { ProtectedAuthorAuthService } from './protected-author-auth.service';
describe('protected author route isolation',()=>{
  const origin='https://admin.example.test';
  const trusted={origin,context:{origin,domain:'example.test',originRole:'protected-admin'}};
  const session=jasmine.createSpy().and.resolveTo(true), legacy=jasmine.createSpy();
  beforeEach(()=>{session.calls.reset();legacy.calls.reset();trusted.origin=origin;TestBed.configureTestingModule({providers:[
    {provide:PLATFORM_ID,useValue:'browser'}, {provide:ProtectedOriginService,useValue:trusted},
    {provide:RuntimeConfigService,useValue:{authRemote:()=>({enabled:true,requiredOrigin:origin}),auth:()=>({enabled:true,allowedGroups:['owner'],loginPath:'/admin/journal/access'})}},
    {provide:AuthFacade,useValue:{isAuthenticated:()=>false,hasAnyGroup:()=>false}},
    {provide:AuthAdminClientService,useValue:{me:legacy}}, {provide:ProtectedAuthorAuthService,useValue:{session}},
  ]});});
  afterEach(()=>TestBed.resetTestingModule());
  it('opens the access screen only on the trusted origin without requiring an existing session',async()=>{
    const route={path:'/admin/journal/access',pageId:'access',auth:{required:true}};
    expect((await TestBed.inject(AuthRuntimeService).evaluateRouteAccessAsync(route)).allowed).toBeTrue();
    expect(session).not.toHaveBeenCalled();expect(legacy).not.toHaveBeenCalled();
    trusted.origin='https://public.example.test';
    expect((await TestBed.inject(AuthRuntimeService).evaluateRouteAccessAsync(route)).allowed).toBeFalse();
  });
  it('uses fresh v2 session checks for the editor, never the Zoosite account client',async()=>{
    const route={path:'/admin/journal/:articleId/edit',pageId:'edit',auth:{required:true,allowedGroups:['owner']}};
    const auth=TestBed.inject(AuthRuntimeService);
    expect((await auth.evaluateRouteAccessAsync(route)).allowed).toBeTrue();
    session.and.resolveTo(false);
    expect((await auth.evaluateRouteAccessAsync(route)).allowed).toBeFalse();
    expect(session).toHaveBeenCalledTimes(2);expect(legacy).not.toHaveBeenCalled();
    session.and.resolveTo(true);
  });
});
