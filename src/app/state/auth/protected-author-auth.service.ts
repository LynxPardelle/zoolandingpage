import { inject, Injectable } from '@angular/core';
import { ProtectedOriginService } from '../../shared/services/protected-origin.service';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { isExactHttpsOrigin } from '../../shared/utility/auth/protected-admin-origin.utility';
const ROUTES:Record<string,string>={signin:'/auth-v2/session/signin',challenge:'/auth-v2/session/challenge/respond',setup:'/auth-v2/session/mfa/setup',verify:'/auth-v2/session/mfa/verify',logout:'/auth-v2/session/logout'};
@Injectable({providedIn:'root'})
export class ProtectedAuthorAuthService {
  private readonly origin=inject(ProtectedOriginService);
  private readonly runtime=inject(RuntimeConfigService);
  async session(requiredGroups:readonly string[]=[]):Promise<boolean> {
    try {
      const data=await this.request('/auth-v2/session/me','GET');
      const account=data['account'] as {accountPurpose?:string;roles?:string[]} | undefined;
      const session=data['session'] as {idleExpiresAt?:number;absoluteExpiresAt?:number} | undefined;
      return data['status']==='signed-in' && ['qa','client-owner'].includes(account?.accountPurpose??'')
        && Array.isArray(account?.roles) && [...(this.runtime.auth()?.allowedGroups??[]),...requiredGroups].every(role=>account!.roles!.includes(role))
        && Number(session?.idleExpiresAt)>Date.now()/1000 && Number(session?.absoluteExpiresAt)>Date.now()/1000;
    } catch {return false;}
  }
  async submit(operation:string,values:Record<string,unknown>):Promise<Record<string,unknown>> {
    const path=ROUTES[operation]; if(!path) throw new Error('unsupported_operation');
    const payload:Record<string,unknown>={};
    const fields=operation==='signin'?['email','password']:operation==='challenge'?['code','newPassword']:operation==='verify'?['code']:[];
    for(const field of fields) if(typeof values[field]==='string') payload[field]=values[field];
    const session=this.runtime.auth()?.session;
    const cookie=operation==='verify'?session?.mfaEnrollCsrfCookieName:operation==='logout'?session?.csrfCookieName:
      operation==='setup'||operation==='challenge'?session?.challengeCsrfCookieName:undefined;
    if(operation!=='signin' && !cookie) throw new Error('csrf_unavailable');
    return this.request(path,'POST',payload,cookie);
  }
  private async request(path:string,method:string,payload?:Record<string,unknown>,cookieName?:string):Promise<Record<string,unknown>> {
    const trusted=this.origin.context, required=this.runtime.authRemote()?.requiredOrigin;
    if(!trusted || !isExactHttpsOrigin(required) || trusted.origin!==required || this.origin.origin!==required) throw new Error('origin_denied');
    const headers:Record<string,string>={Accept:'application/json','Content-Type':'application/json'};
    if(cookieName) {
      if(!/^zlp_(?:challenge_csrf|mfa_enroll_csrf|csrf)_[a-z0-9_]{1,64}$/.test(cookieName)) throw new Error('csrf_unavailable');
      const entries=document.cookie.split(';').map(v=>v.trim()).filter(v=>v.startsWith(cookieName+'='));
      const value=entries.length===1?entries[0].slice(cookieName.length+1):'';
      if(!value || value.length>2048 || /[\s\r\n]/.test(value)) throw new Error('csrf_unavailable');
      headers['X-ZLP-CSRF']=value;
    }
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch(path,{method,headers,credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal,...(payload?{body:JSON.stringify(payload)}:{})});
      const data:unknown=await response.json();
      if(!response.ok || !data || typeof data!=='object' || Array.isArray(data) || (data as Record<string,unknown>)['ok']!==true) throw new Error('authentication_failed');
      return data as Record<string,unknown>;
    } finally {clearTimeout(timeout);}
  }
}
