import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { TResolvedDraftContext } from '../../shared/services/draft-runtime.service';
import { VariableStoreService } from '../../shared/services/variable-store.service';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { ProtectedOriginService } from '../../shared/services/protected-origin.service';
import { I18nService } from '../../shared/services/i18n.service';
import { GenericModalService } from '../../shared/components/generic-modal/generic-modal.service';
import { FixedArticleClient } from '../../shared/utility/content-hub/fixed-article-client';
import { FixedArticleMedia } from '../../shared/utility/content-hub/fixed-article-media';
import { navigateInCurrentWindow } from '../../shared/utility/navigation/browser-navigation.utility';
import { FixedArticleEditor, type ArticlePackage, type EditorLocale, type PrivateArticle, type PublicationAck } from './fixed-article-editor';

type ListArticle = PrivateArticle & {locales: Partial<Record<EditorLocale,{title?:string;tags?:string[];state:string;package:ArticlePackage}>>};
type Preview = {title:string;summary:string;cover:ArticlePackage['cover'];articleContent:{html:string}};
const object = (v:unknown): Record<string,unknown> => v && typeof v === 'object' ? v as Record<string,unknown> : {};
const locale = (v:unknown): EditorLocale => v === 'es' ? 'es' : 'en';
/** Opt-in adapter between draft primitives and the private transport/editor engines. */
@Injectable({providedIn:'root'})
export class FixedArticleDeskService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly vars = inject(VariableStoreService);
  private readonly runtime = inject(RuntimeConfigService);
  private readonly origin = inject(ProtectedOriginService);
  private readonly i18n = inject(I18nService);
  private readonly modal = inject(GenericModalService);
  private client: FixedArticleClient | null = null;
  private editor: FixedArticleEditor | null = null;
  private media: FixedArticleMedia | null = null;
  private route: TResolvedDraftContext | null = null;
  private key = '';
  private generation = 0;
  private listSequence = 0;
  private creationKey = '';
  private pending: Promise<void> | null = null;
  private filters: Record<string,string> = {};
  private articles: ListArticle[] = [];
  private selectedLocale: EditorLocale = 'en';
  private currentHref = '';
  private imageSources:Record<string,string>={};
  private documentRevision=0;
  private recovery: {articleId:string;locale:EditorLocale;package:ArticlePackage}|null=null;
  private publicationRequest: {operation:'publish'|'unpublish';data:Record<string,unknown>}|null=null;
  private publicationInFlight=false;
  private publicationAuthRequired=false;
  private readonly unload = (event: BeforeUnloadEvent) => {if (this.editor?.snapshot().dirty) {event.preventDefault();event.returnValue='';}};

  constructor() {
    if (this.browser) window.addEventListener('beforeunload',this.unload);
    inject(DestroyRef).onDestroy(()=>{ this.stop(); if(this.browser) window.removeEventListener('beforeunload',this.unload); });
  }
  async prepareNavigation(context?:TResolvedDraftContext):Promise<boolean> {
    if (!this.browser || !this.editor?.snapshot().dirty) return true;
    if (await this.editor.canLeave()) return true;
    // A denied SPA/popstate transition must not reset the variable store or unmount the editor.
    if(this.currentHref) window.history.replaceState(window.history.state,'',this.currentHref);
    this.set('error','unsaved_changes');return false;
  }
  async start(context: TResolvedDraftContext): Promise<void> {
    const config = this.vars.getRecord('journalDeskConfig');
    const remote = this.runtime.authRemote();
    const trusted = this.origin.context;
    if (!this.browser || config?.['template'] !== 'fixed-article-v2' || !trusted
      || trusted.domain !== context.domain || context.originRole !== 'protected-admin'
      || remote?.requiredOrigin !== trusted.origin || this.origin.origin !== trusted.origin
      || !/^\/admin\/journal(?:\/|$)/.test(context.path) || context.route?.auth?.required !== true) {
      this.stop(); return;
    }
    if (context.path === '/admin/journal/access' || context.path === '/admin/journal/mfa') {
      this.stop();this.set('uiLang',new URL(window.location.href).searchParams.get('lang')==='es'?'es':'en');
      const challenge=new URL(window.location.href).searchParams.get('challenge');
      if(context.path.endsWith('/mfa') && ['SOFTWARE_TOKEN_MFA','MFA_SETUP','NEW_PASSWORD_REQUIRED'].includes(challenge??'')) this.vars.setRuntimeValue('journalAuth.challenge',challenge);
      return;
    }
    const key = `${context.domain}|${context.path}`;
    if (key === this.key) {await this.pending;this.currentHref=window.location.href;this.set('uiLang',new URL(this.currentHref).searchParams.get('lang')==='es'?'es':'en');this.sync();this.renderRows();return;}
    if (this.editor?.snapshot().dirty && !await this.editor.canLeave()) {this.set('error','unsaved_changes'); return;}
    this.stop(); this.key=key; this.route=context; this.currentHref=window.location.href; const generation=this.generation;
    this.selectedLocale=locale(new URL(window.location.href).searchParams.get('articleLocale'));
    this.set('uiLang',new URL(window.location.href).searchParams.get('lang')==='es'?'es':'en');
    const auth=this.runtime.auth();
    if (!auth?.authProfileId || auth.authProfileId !== remote.authProfileId || !auth.session?.csrfCookieName) {this.set('error','auth_required');return;}
    this.client = new FixedArticleClient({requiredOrigin:trusted.origin,domain:trusted.domain,
      hubId:String(config['hubId'] ?? ''),authProfileId:auth.authProfileId,
      csrfCookieName:auth.session.csrfCookieName,basePath:'/features/content-hub-v2'},
      {origin:this.origin.origin,path:context.path,surface:trusted.originRole,cookie:()=>document.cookie});
    const client=this.client;
    this.editor=new FixedArticleEditor({save:value=>client.action<PrivateArticle>('updatePackage',value)});
    this.editor.subscribe(()=>this.sync());
    this.media=new FixedArticleMedia(client,this.editor);
    this.media.subscribe(()=>{const status=this.media?.snapshot().status;this.set('media',{status,busy:status!=='idle'&&status!=='error'});});
    this.creationKey=crypto.randomUUID().replace(/-/g,'');
    this.set('busy',true); this.set('error',''); this.set('publicationAvailable',false);
    this.setOptions();
    this.pending=(async()=>{
      try {
        if(context.path === '/admin/journal') {await this.loadList();return;}
        const article = context.path === '/admin/journal/new'
          ? await client.action<PrivateArticle>('createArticle',{locale:this.selectedLocale,idempotencyKey:this.creationKey})
          : await client.read<PrivateArticle>('articleDetail',{articleId:context.routeParams?.['articleId']});
        if(generation!==this.generation) return;
        this.documentRevision++;this.editor!.open(article,this.selectedLocale); await this.refreshCover();await this.refreshInlineImages();
        if(context.path==='/admin/journal/new' && new URL(window.location.href).pathname===context.path) {
          const path=`/admin/journal/${encodeURIComponent(article.articleId)}/edit`;
          const url=new URL(window.location.href);url.pathname=path;
          window.history.replaceState(window.history.state,'',url.href);
          this.currentHref=url.href;this.key=`${context.domain}|${path}`;
          this.route={...context,path,routeParams:{articleId:article.articleId}};
        }
        if(context.path.endsWith('/preview')) await this.loadPreview();
      } catch(error) {if(generation===this.generation) this.failure(error);}
      finally {if(generation===this.generation) {this.set('busy',false);this.pending=null;}}
    })();
    await this.pending;
  }

  async act(operation:string, data:unknown={}, eventName=''): Promise<void> {
    if(operation==='uiLanguage' && this.browser && this.origin.context && this.origin.origin===this.origin.context.origin) {
      if(!await this.prepareNavigation()) return;
      const next=object(data)['id'];if(next!=='es'&&next!=='en') return;
      const url=new URL(window.location.href);url.searchParams.set('lang',next);navigateInCurrentWindow(url.href);return;
    }
    if(!this.client || !this.editor || !this.route) return;
    const raw=object(data), value={...raw,...object(raw['rowData'])};
    if(operation==='row') operation=String(raw['actionId']??'');
    try {
      if(operation==='field') {
        if(eventName==='blurred') {await this.editor.flush();return;}
        const field=String(value['fieldId']??''); const input=value['value'];
        if(['title','summary','seriesId'].includes(field) && typeof input==='string') this.editor.change({[field]:input});
        else if(field==='tags' && typeof input==='string') this.editor.change({tags:input.split(',').map(s=>s.trim()).filter(Boolean)});
        else if(field==='delta' && input && typeof input==='object') this.editor.change({delta:this.mapImages(input as ArticlePackage['delta'],true)});
        else if(['coverAlt','focalX','focalY'].includes(field)) {
          this.set(field,input); const cover=this.editor.snapshot().package.cover;
          if(cover) {
            if(field!=='coverAlt' && (typeof input!=='number'||!Number.isFinite(input)||input<0||input>100)) return;
            this.editor.change({cover:{...cover,[field==='coverAlt'?'alt':field]:input}});
            this.setCoverStyle();
          }
        } else if(field==='inlineAlt') this.set('inlineAlt',input);
      } else if(operation==='filter') {
        if(eventName==='blurred') return;
        const field=String(value['fieldId']??'');
        if(['search','seriesId','state','locale'].includes(field)) {
          const text=String(value['value']??''); if(text) this.filters[field]=text;else delete this.filters[field];
          await this.loadList();
        }
      } else if(operation==='locale') {
        const next=locale(value['id']??value['value']);
        if(this.route.path==='/admin/journal') {this.selectedLocale=next;this.renderRows();}
        else if(await this.editor.switchLocale(next)) {this.documentRevision++;this.selectedLocale=next;this.imageSources={};await this.refreshCover();await this.refreshInlineImages();this.sync();}
        else this.set('error','unsaved_changes');
      } else if(operation==='reloadConflict' && this.editor.snapshot().status==='conflict') {
        const state=this.editor.snapshot(),generation=this.generation;
        const latest=await this.client.read<PrivateArticle>('articleDetail',{articleId:state.articleId});
        if(generation!==this.generation) return;
        this.recovery={articleId:state.articleId!,locale:state.locale,package:state.package};
        this.set('recoveryText',[state.package.title,state.package.summary,...state.package.delta.ops.map(op=>typeof op.insert==='string'?op.insert:'')].join('\n'));
        this.documentRevision++;this.editor.discardAndOpen(latest,state.locale);
        await this.refreshCover();await this.refreshInlineImages();this.set('error','');
      } else if(operation==='restoreConflict' && this.recovery) {
        const state=this.editor.snapshot();
        if(state.articleId!==this.recovery.articleId||state.locale!==this.recovery.locale) return;
        this.documentRevision++;
        this.editor.change({...this.recovery.package,seriesId:state.seriesLocked?state.package.seriesId:this.recovery.package.seriesId});
        await this.refreshCover();await this.refreshInlineImages();
      } else if(operation==='reauthenticate') {
        if(this.editor.snapshot().status==='auth-required'||this.publicationAuthRequired) this.modal.open({id:'journalReauth'});
      } else if(operation==='resumeAfterAuth') {
        if(this.publicationRequest) {this.publicationAuthRequired=false;await this.publish(this.publicationRequest.operation);}
        else await this.editor.resumeAfterAuthentication();
      } else if(operation==='retryPublication') {if(this.publicationRequest) await this.publish(this.publicationRequest.operation);}
      else if(operation==='save' || operation==='retry') {
        if(this.publicationRequest) await this.publish(this.publicationRequest.operation);else await this.editor.retry();
      }
      else if(operation==='refresh') await this.loadList();
      else if(operation==='cover' || operation==='inline') {
        const file=Array.isArray(value['files'])?value['files'][0]:null;
        if(!(file instanceof Blob)) return;
        const alt=String(this.vars.get(operation==='cover'?'journalDesk.coverAlt':'journalDesk.inlineAlt')??'');
        if(operation==='cover') {await this.media!.uploadCover(file,alt);await this.refreshCover();}
        else {await this.media!.uploadInline(file,alt);await this.refreshInlineImages();}
      } else if(operation==='cancelUpload') this.media?.cancel();
      else if(operation==='preview') {
        if(!await this.editor.canLeave()) {this.set('error','unsaved_changes');return;}
        const id=String(value['articleId']??this.editor.snapshot().articleId??'');
        if(/^[A-Za-z0-9_-]{1,80}$/.test(id)) this.navigate(`/admin/journal/${id}/preview`);
      } else if(operation==='edit' || operation==='list' || operation==='new') {
        if(!await this.editor.canLeave()) {this.set('error','unsaved_changes');return;}
        const id=String(value['articleId'] ?? this.editor.snapshot().articleId ?? '');
        if(operation==='edit' && !/^[A-Za-z0-9_-]{1,80}$/.test(id)) return;
        this.navigate(operation==='edit'?`/admin/journal/${id}/edit`:operation==='new'?'/admin/journal/new':'/admin/journal');
      } else if(operation==='publish' || operation==='unpublish') {
        if(operation==='unpublish' && !this.publicationRequest) {
          const prompt=this.i18n.get('desk.confirmWithdraw')??'Withdraw this language? Your working copy and other published language will be kept.';
          if(!window.confirm(prompt+' ('+this.editor.snapshot().locale.toUpperCase()+')')) return;
        }
        await this.publish(operation);
      }
    } catch(error) {this.failure(error);}
  }

  private async publish(operation:'publish'|'unpublish'):Promise<void> {
    if(!this.client||!this.editor||this.publicationInFlight) return;
    if(this.publicationRequest && this.publicationRequest.operation!==operation) {this.set('error','publication_pending');return;}
    if(!this.publicationRequest) {
      if(!this.editor.snapshot().publicationAvailable) {this.set('error','feature_not_ready');return;}
      if(!await this.editor.canLeave()) {this.set('error','unsaved_changes');return;}
      this.publicationRequest={operation,data:{...this.editor.beginPublication(operation),idempotencyKey:crypto.randomUUID().replace(/-/g,'')}};
    }
    const generation=this.generation,request=this.publicationRequest;
    this.publicationInFlight=true;this.set('publicationBusy',true);this.set('error','');this.set('publicationMessage','');this.sync();
    try {
      const result=await this.client.action<PublicationAck|{valid:false;errors:unknown[]}>(operation==='publish'?'publish':'unpublishArticle',request.data);
      if(generation!==this.generation) return;
      if(result && 'valid' in result && result.valid===false) {
        this.editor.cancelPublication(422);this.publicationRequest=null;this.set('error','publication_invalid');
        this.set('publicationMessage',this.i18n.get('desk.publicationInvalid')??'Check the title, summary, cover, image descriptions and article text.');
        return;
      }
      this.editor.finishPublication(result as PublicationAck);this.publicationRequest=null;this.publicationAuthRequired=false;
      this.set('publicationMessage',this.i18n.get(operation==='publish'?'desk.publishSuccess':'desk.withdrawSuccess')
        ??(operation==='publish'?'This language is published. Cache refresh is being processed.':'This language has been withdrawn. Your working copy is preserved.'));
    } catch(error) {
      if(generation!==this.generation) return;
      const status=object(error)['status'];
      if(status===401||status===403) this.publicationAuthRequired=true;
      else if(typeof status==='number' && status>=400 && status<500) {this.editor.cancelPublication(status);this.publicationRequest=null;}
      this.failure(error);
    } finally {
      if(generation===this.generation) {this.publicationInFlight=false;this.set('publicationBusy',false);this.sync();}
    }
  }

  private async loadList(): Promise<void> {
    if(!this.client) return;
    const sequence=++this.listSequence, generation=this.generation;
    this.set('busy',true);
    try {
      const response=await this.client.read<{items:ListArticle[]}>('articleList',{...this.filters});
      if(sequence!==this.listSequence || generation!==this.generation) return;
      if(!Array.isArray(response?.items)) throw new Error('invalid_response');
      this.articles=response.items;this.renderRows();this.set('error','');
    } finally {if(sequence===this.listSequence && generation===this.generation) this.set('busy',false);}
  }
  private renderRows(): void {
    const spanish = this.vars.get('journalDesk.uiLang') === 'es';
    const states: Record<string, [string,string]> = {
      'draft':['Draft','Borrador'], 'not-started':['Not started','Sin iniciar'],
      'published':['Published','Publicado'], 'updates-pending':['Changes pending','Cambios pendientes'],
      'unpublished':['Unpublished','Retirado'],
    };
    const label = (state?:string) => (states[state ?? 'not-started'] ?? states['not-started'])[spanish?1:0];
    this.set('rows',this.articles.map(a=>({articleId:a.articleId,
      title:a.locales[this.selectedLocale]?.title || a.locales[this.selectedLocale]?.package?.title || '',
      enState:label(a.locales.en?.state),esState:label(a.locales.es?.state),seriesId:a.seriesId,
      stateLabel:`EN: ${label(a.locales.en?.state)} · ES: ${label(a.locales.es?.state)}`,
      editPath:`/admin/journal/${encodeURIComponent(a.articleId)}/edit?articleLocale=${this.selectedLocale}&lang=${this.vars.get('journalDesk.uiLang')==='es'?'es':'en'}`,
      previewPath:`/admin/journal/${encodeURIComponent(a.articleId)}/preview?articleLocale=${this.selectedLocale}`})));
    this.set('selectedLocale',this.selectedLocale);
  }
  private async loadPreview(): Promise<void> {
    const state=this.editor!.snapshot(), generation=this.generation;
    this.set('preview',null);
    const preview=await this.client!.read<Preview>('publicBundlePreview',{articleId:state.articleId,locale:state.locale});
    const html=await this.media!.hydratePreview(preview.articleContent.html);
    if(generation===this.generation) this.set('preview',{title:preview.title,summary:preview.summary,html});
  }
  private async refreshCover(): Promise<void> {
    const state=this.editor?.snapshot(), generation=this.generation;
    this.set('coverSrc','');this.set('coverAlt',state?.package.cover?.alt??'');
    this.setCoverStyle();
    if(!state?.package.cover) return;
    const src=await this.media!.preview(state.package.cover.assetId);
    if(generation===this.generation && state.locale===this.editor?.snapshot().locale) this.set('coverSrc',src);
  }
  private sync(): void {
    if(!this.editor) return;
    const snapshot=this.editor.snapshot();this.set('editor',snapshot);this.set('tagsText',snapshot.package.tags.join(', '));
    this.set('publicationAvailable',snapshot.publicationAvailable);
    this.set('publicationPending',snapshot.publicationPending);
    this.set('canUnpublish',snapshot.publicationAvailable && !!snapshot.localeStates[snapshot.locale]?.publishedRevisionId);
    this.set('statusText',this.i18n.get(`desk.saveStates.${snapshot.status}`)??this.vars.get(`journalDeskLabels.${snapshot.status}`)??snapshot.status);
    const reauth=snapshot.status==='auth-required'||this.publicationAuthRequired;
    this.set('reauthRequired',reauth);
    if(reauth && this.modal.modalRef()?.id!=='journalReauth') {
      this.vars.setRuntimeValue('journalAuth.challenge','signin');this.modal.open({id:'journalReauth'});
    } else if(!reauth && this.modal.modalRef()?.id==='journalReauth') this.modal.close();
    this.set('valueRevision',`${snapshot.articleId}:${snapshot.locale}:${this.documentRevision}`);
    this.set('displayDelta',this.mapImages(snapshot.package.delta));
    this.set('privateImageSources',Object.values(this.imageSources));
    this.setOptions();
  }
  private setOptions():void {
    const label=(key:string,fallback:string)=>String(this.i18n.get(`desk.${key}`)??fallback);
    const options=[{value:'form-movement',label:label('form','Form & movement')},
      {value:'observation-process',label:label('observation','Observation & process')},{value:'bridal-forms',label:label('bridal','Bridal forms')}];
    this.set('seriesOptions',options);
    this.set('seriesFilterOptions',[{value:'',label:label('allSeries','All series')},...options]);
    this.set('stateOptions',[{value:'',label:label('allStates','All states')},{value:'draft',label:label('draft','Draft')},{value:'published',label:label('published','Published')}]);
  }
  private mapImages(delta:ArticlePackage['delta'],reverse=false):ArticlePackage['delta'] {
    const mapping=reverse?Object.fromEntries(Object.entries(this.imageSources).map(([id,url])=>[url,id])):this.imageSources;
    return {...delta,ops:delta.ops.map(op=>typeof op.insert==='object' && op.insert!==null && 'image' in op.insert
      ? {...op,insert:{...op.insert,image:mapping[String(op.insert.image)]??op.insert.image}}:op)};
  }
  private setCoverStyle():void {
    const cover=this.editor?.snapshot().package.cover;
    this.set('coverStyle',{'object-fit':'cover','aspect-ratio':'4 / 3','width':'100%',
      'object-position':`${cover?.focalX??50}% ${cover?.focalY??50}%`});
  }
  private async refreshInlineImages():Promise<void> {
    const snapshot=this.editor!.snapshot(), generation=this.generation;
    const sources:Record<string,string>={};
    for(const op of snapshot.package.delta.ops) if(typeof op.insert==='object'&&op.insert!==null&&'image' in op.insert) {
      const id=String(op.insert.image);sources[id]=await this.media!.preview(id);
    }
    if(generation===this.generation && snapshot.locale===this.editor?.snapshot().locale) {this.imageSources=sources;this.sync();}
  }
  private set(path:string,value:unknown): void {this.vars.setRuntimeValue(`journalDesk.${path}`,value);}
  private failure(error:unknown): void {
    const code=object(error)['code'];this.set('error',typeof code==='string'&&/^[a-z_]{1,64}$/.test(code)?code:'request_failed');
  }
  private navigate(path:string): void {
    const lang=new URL(window.location.href).searchParams.get('lang')==='es'?'es':'en';
    navigateInCurrentWindow(`${path}?lang=${lang}&articleLocale=${this.selectedLocale}`,{scrollRestoration:{mode:'top'}});
  }
  private stop(): void {
    if(this.modal.modalRef()?.id==='journalReauth') this.modal.close();
    this.recovery=null;
    this.publicationRequest=null;this.publicationInFlight=false;this.publicationAuthRequired=false;
    this.generation++;this.media?.destroy();this.editor?.destroy();this.media=null;this.editor=null;this.client=null;
    this.route=null;this.key='';this.pending=null;this.articles=[];this.filters={};this.imageSources={};this.vars.setRuntimeValue('journalDesk',{});
  }
}
