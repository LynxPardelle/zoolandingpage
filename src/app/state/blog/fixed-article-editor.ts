/** Fixed-package autosave engine. Opt-in only; the existing blog store is unchanged. */
export type EditorLocale = 'en' | 'es';
export type ArticlePackage = {
  title: string; summary: string; seriesId: string; tags: string[];
  cover: { assetId: string; alt: string; focalX: number; focalY: number } | null;
  delta: { ops: Array<{ insert: string | { image: string }; attributes?: Record<string, unknown> }> };
};
export type PrivateArticle = {
  articleId: string; concurrencyToken: string; seriesId: string;
  seriesLocked?: boolean; publicationAvailable?: boolean;
  locales: Partial<Record<EditorLocale, { package: ArticlePackage; state: string; path?: string; workingRevisionId?: string; publishedRevisionId?: string }>>;
};
export type EditorStatus = 'idle' | 'editing' | 'saving' | 'saved' | 'retrying' | 'retry-required' | 'auth-required' | 'conflict' | 'validation-error';
export type SaveRequest = { articleId: string; locale: EditorLocale; concurrencyToken: string; package: ArticlePackage };
export type EditorApi = { save(value: SaveRequest): Promise<PrivateArticle> };
export type PublicationAck = {articleId:string;locale:EditorLocale;state:'published'|'unpublished';concurrencyToken:string};
export type EditorClock = { schedule(callback: () => void, ms: number): unknown; cancel(id: unknown): void };
export class EditorRequestError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
const clone = <T>(value: T): T => structuredClone(value);
const emptyPackage = (seriesId: string): ArticlePackage => ({ title: '', summary: '', seriesId, tags: [], cover: null, delta: { ops: [{ insert: '\n' }] } });
const browserClock: EditorClock = {
  schedule: (callback, ms) => globalThis.setTimeout(callback, ms),
  cancel: id => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
};

export class FixedArticleEditor {
  private article: PrivateArticle | null = null;
  private locale: EditorLocale = 'en';
  private value: ArticlePackage = emptyPackage('form-movement');
  private savedValue: ArticlePackage = clone(this.value);
  private status: EditorStatus = 'idle';
  private revision = 0;
  private generation = 0;
  private attempts = 0;
  private timer: unknown = null;
  private inFlight: Promise<void> | null = null;
  private pendingWrite: { request: SaveRequest; revision: number } | null = null;
  private publication: {operation:'publish'|'unpublish';revisionId:string;concurrencyToken:string}|null=null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly api: EditorApi, private readonly clock: EditorClock = browserClock) {}

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  snapshot() {
    return { articleId: this.article?.articleId ?? null, concurrencyToken: this.article?.concurrencyToken ?? null,
      locale: this.locale, package: clone(this.value), status: this.status,
      dirty: this.publication !== null || this.pendingWrite !== null || JSON.stringify(this.value) !== JSON.stringify(this.savedValue),
      publicationAvailable: this.article?.publicationAvailable === true, publicationPending: this.publication !== null,
      hasUnacknowledgedWrite: this.pendingWrite !== null,
      seriesLocked: this.article?.seriesLocked ?? false,
      localeStates: clone(this.article?.locales ?? {}) };
  }

  open(article: PrivateArticle, locale: EditorLocale): void {
    if (this.snapshot().dirty || this.inFlight) throw new Error('unsaved_changes');
    this.load(article, locale);
  }

  discardAndOpen(article: PrivateArticle, locale: EditorLocale): void { this.load(article, locale); }

  private load(article: PrivateArticle, locale: EditorLocale): void {
    this.cancelTimer(); this.generation++; this.inFlight = null; this.pendingWrite = null; this.publication=null;
    this.article = clone(article); this.locale = locale;
    this.value = clone(article.locales[locale]?.package ?? emptyPackage(article.seriesId));
    this.savedValue = clone(this.value); this.status = 'idle'; this.revision = 0; this.attempts = 0;
    this.notify();
  }

  change(patch: Partial<ArticlePackage>): void {
    if (!this.article) throw new Error('article_required');
    this.value = { ...this.value, ...clone(patch) }; this.revision++;
    if (this.status === 'validation-error') this.status = 'editing';
    if (!this.blocked()) { this.status = 'editing'; this.attempts = 0; this.schedule(1500); }
    this.notify();
  }

  async flush(): Promise<void> {
    this.cancelTimer();
    if (this.publication) return;
    if (this.inFlight) { await this.inFlight; return; }
    if (!this.article || !this.snapshot().dirty || this.blocked()) return;
    const generation = this.generation;
    // A lost response may hide a successful commit. Resolve the exact original
    // request before sending later typing, including a reversal to savedValue.
    if (!this.pendingWrite) this.pendingWrite = { revision: this.revision, request: {
      articleId: this.article.articleId, concurrencyToken: this.article.concurrencyToken,
      locale: this.locale, package: clone(this.value) } };
    const { request, revision } = this.pendingWrite;
    const { locale, package: value } = request;
    this.status = 'saving'; this.notify();
    const saving = (async () => {
      try {
        const response = await Promise.resolve().then(() => this.api.save(request));
        if (generation !== this.generation || !this.article) return;
        if (!response || response.articleId !== request.articleId
          || typeof response.concurrencyToken !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(response.concurrencyToken)
          || typeof response.seriesId !== 'string' || !response.locales?.[locale]) {
          throw new EditorRequestError(502, 'invalid_acknowledgement');
        }
        this.pendingWrite = null;
        // Server metadata advances, but a response never replaces unsent local typing.
        this.article = { ...this.article, concurrencyToken: response.concurrencyToken, seriesId: response.seriesId,
          seriesLocked: response.seriesLocked, publicationAvailable: response.publicationAvailable === true, locales: { ...clone(response.locales),
            [locale]: { ...response.locales[locale], state: response.locales[locale]?.state ?? 'draft', package: clone(value) } } };
        this.savedValue = clone(value); this.attempts = 0;
        this.status = this.revision === revision ? 'saved' : 'editing';
        if (this.snapshot().dirty) this.schedule(1500);
      } catch (error) {
        if (generation !== this.generation) return;
        // Transport adapters share a status contract, not a concrete Error class.
        const status = error && typeof error === 'object' && 'status' in error ? error.status : null;
        if (status === 401 || status === 403) this.status = 'auth-required';
        else if (status === 409) this.status = 'conflict';
        else if (typeof status === 'number' && status >= 400 && status < 500) {
          this.pendingWrite = null; this.status = 'validation-error';
        }
        else {
          const delays = [1000, 3000, 10000];
          if (this.attempts < delays.length) { this.status = 'retrying'; this.schedule(delays[this.attempts++]); }
          else this.status = 'retry-required';
        }
      } finally {
        if (generation === this.generation) { this.inFlight = null; this.notify(); }
      }
    })();
    this.inFlight = saving;
    await saving;
  }

  async retry(): Promise<void> {
    if (this.status === 'auth-required' || this.status === 'conflict') return;
    this.attempts = 0; this.status = 'editing'; await this.flush();
  }

  beginPublication(operation:'publish'|'unpublish') {
    const state=this.article?.locales[this.locale];
    if (!this.article || this.article.publicationAvailable!==true || this.snapshot().dirty || this.inFlight || this.blocked()
      || !state || (operation==='publish' && !state.workingRevisionId)
      || (operation==='unpublish' && !state.publishedRevisionId)) throw new EditorRequestError(409,'publication_not_ready');
    this.cancelTimer();
    this.publication={operation,revisionId:operation==='publish'?state.workingRevisionId!:'',concurrencyToken:this.article.concurrencyToken};
    this.notify();
    return {articleId:this.article.articleId,locale:this.locale,concurrencyToken:this.article.concurrencyToken,
      ...(operation==='publish'?{revisionId:this.publication.revisionId}:{})};
  }

  finishPublication(response:PublicationAck):void {
    if (!this.article || !this.publication || !response || response.articleId!==this.article.articleId || response.locale!==this.locale
      || this.article.concurrencyToken!==this.publication.concurrencyToken
      || response.state!==(this.publication.operation==='publish'?'published':'unpublished')
      || typeof response.concurrencyToken!=='string' || !/^[A-Za-z0-9_-]{1,80}$/.test(response.concurrencyToken))
      throw new EditorRequestError(502,'invalid_acknowledgement');
    const state=this.article.locales[this.locale]!;
    this.article.concurrencyToken=response.concurrencyToken;
    state.state=response.state;
    if(response.state==='published') {state.publishedRevisionId=this.publication.revisionId;this.article.seriesLocked=true;}
    else delete state.publishedRevisionId;
    this.publication=null;this.status=this.snapshot().dirty?'editing':'saved';
    if(this.snapshot().dirty) this.schedule(1500);
    this.notify();
  }

  cancelPublication(status:number):void {
    this.publication=null;this.status=status===409?'conflict':'validation-error';this.notify();
  }

  async resumeAfterAuthentication(): Promise<void> {
    if (this.status !== 'auth-required') return;
    this.status = 'editing'; this.attempts = 0; await this.flush();
  }

  async switchLocale(locale: EditorLocale): Promise<boolean> {
    if (locale === this.locale) return true;
    if (!await this.canLeave() || !this.article) return false;
    this.load(this.article, locale); return true;
  }

  async canLeave(): Promise<boolean> {
    await this.flush();
    // Edits that arrived during a save need their own acknowledged save.
    if (this.snapshot().dirty && this.status === 'editing') await this.flush();
    return !this.snapshot().dirty && !this.inFlight;
  }

  destroy(): void { this.cancelTimer(); this.generation++; this.listeners.clear(); }
  private blocked(): boolean { return ['auth-required', 'conflict', 'retry-required', 'validation-error'].includes(this.status); }
  private schedule(ms: number): void { this.cancelTimer(); this.timer = this.clock.schedule(() => { this.timer = null; void this.flush(); }, ms); }
  private cancelTimer(): void { if (this.timer !== null) this.clock.cancel(this.timer); this.timer = null; }
  private notify(): void { for (const callback of this.listeners) callback(); }
}
