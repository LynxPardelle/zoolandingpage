import { inject } from '@angular/core';
import { findInteractionScopeHost } from '../../../components/interaction-scope/interaction-scope.service';
import { FixedArticleDeskService } from '../../../../state/blog/fixed-article-desk.service';
import { ProtectedAuthorAuthService } from '../../../../state/auth/protected-author-auth.service';
import { VariableStoreService } from '../../../services/variable-store.service';
import { navigateInCurrentWindow } from '../../navigation/browser-navigation.utility';
import type { EventHandler } from '../event-handler.types';

export const fixedArticleActionHandler=():EventHandler=>{
  const desk=inject(FixedArticleDeskService);
  return {id:'fixedArticleAction',handle:(ctx,args)=>desk.act(String(args[0]??''),ctx.event.eventData,ctx.event.eventName)};
};
export const protectedAuthorAuthHandler=():EventHandler=>{
  const auth=inject(ProtectedAuthorAuthService),vars=inject(VariableStoreService),desk=inject(FixedArticleDeskService);
  return {id:'protectedAuthorAuth',handle:async(ctx,args)=>{
    if(vars.get('journalAuth.busy')===true) return;
    const operation=String(args[0]??'');
    if(operation==='logout' && !await desk.prepareNavigation()) return;
    const host=findInteractionScopeHost(ctx.host);
    const snapshot=host?.submitInteractionScope?.()??host?.interactionScope.submit();
    if(!['setup','logout'].includes(operation) && !snapshot?.valid) return;
    vars.setRuntimeValue('journalAuth.busy',true);vars.setRuntimeValue('journalAuth.error','');
    const lang=new URL(window.location.href).searchParams.get('lang')==='es'?'es':'en';
    try {
      const response=await auth.submit(operation,{...snapshot?.values});
      if(response['status']==='signed-in') {
        if(!await auth.session()) throw new Error('session_unavailable');
        vars.setRuntimeValue('journalAuth',{});
        if(vars.get('journalDesk.reauthRequired')===true) await desk.act('resumeAfterAuth');
        else navigateInCurrentWindow('/admin/journal?lang='+lang);
      } else if(response['status']==='challenge-required') {
        const challenge=String(response['challengeName']);
        if(!['SOFTWARE_TOKEN_MFA','MFA_SETUP','NEW_PASSWORD_REQUIRED'].includes(challenge)) throw new Error('unsupported_challenge');
        vars.setRuntimeValue('journalAuth.challenge',challenge);
        // Reauthentication never unmounts the editor or its unsaved content.
        if(vars.get('journalDesk.reauthRequired')!==true) navigateInCurrentWindow('/admin/journal/mfa?challenge='+challenge+'&lang='+lang);
      } else if(response['status']==='mfa-enrollment-required') {
        const mfa=response['mfa'] as Record<string,unknown>;
        const key=String(mfa?.['manualSetupKey']??'');
        if(!/^[A-Z2-7]{16,128}$/.test(key)) throw new Error('invalid_setup');
        vars.setRuntimeValue('journalAuth.manualKey',key);
        vars.setRuntimeValue('journalAuth.qr',`otpauth://totp/${encodeURIComponent(String(mfa['issuer']))}:${encodeURIComponent(String(mfa['accountLabel']))}?secret=${key}&issuer=${encodeURIComponent(String(mfa['issuer']))}&algorithm=SHA1&digits=6&period=30`);
        vars.setRuntimeValue('journalAuth.challenge','VERIFY_SETUP');
      } else if(operation==='logout') {vars.setRuntimeValue('journalAuth',{});navigateInCurrentWindow('/admin/journal/access');}
    } catch {vars.setRuntimeValue('journalAuth.error','authentication_failed');}
    finally {host?.resetInteractionScope?.();if(host&&!host.resetInteractionScope) host.interactionScope.reset();vars.setRuntimeValue('journalAuth.busy',false);}
  }};
};
