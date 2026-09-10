/** Opt-in published-locale Journal projection; legacy hubs retain their paths. */
import type {TContentHubRuntimeArticleSummary} from '../../types/content-hub.types';
type RecordValue=Record<string,unknown>;
const record=(value:unknown):RecordValue=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:{};
export const JOURNAL_SERIES={
  'form-movement':{en:['form-and-movement','Form and movement'],es:['forma-y-movimiento','Forma y movimiento']},
  'observation-process':{en:['observation-and-process','Observation and process'],es:['observacion-y-proceso','Observación y proceso']},
  'bridal-forms':{en:['bridal-forms','Bridal forms'],es:['formas-nupciales','Formas nupciales']},
} as const;
export const isFixedJournal=(hub:unknown):boolean=>record(hub)['localePolicy']==='published-only'&&record(hub)['routeBasePath']==='/the-journal';
export function journalSeries(slug:string,language:string) {
  if(language!=='en'&&language!=='es') return null;
  for(const [id,entry] of Object.entries(JOURNAL_SERIES)) if(entry[language][0]===slug) return {id,slug,title:entry[language][1]};
  return null;
}
export function journalArticle(article:unknown,language:string):TContentHubRuntimeArticleSummary|null {
  const raw=record(article),locals=record(raw['localizations']);
  if(!['en','es'].includes(language)||raw['status']!=='published'||(raw['visibility']!==undefined&&raw['visibility']!=='public')
    ||typeof raw['articleId']!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(raw['articleId'])) return null;
  const selected=locals[language]!==undefined?record(locals[language]):raw['locale']===language?raw:null;
  if(!selected||typeof selected['title']!=='string'||!selected['title'].trim()||typeof selected['path']!=='string'
    ||typeof selected['publishedAt']!=='string'||!Number.isFinite(Date.parse(selected['publishedAt']))) return null;
  const match=/^\/the-journal\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(selected['path']);
  if(!match||!journalSeries(match[1],language)||selected['categorySlug']!==match[1]) return null;
  // Do not inherit the base language's body, cover or summary into another one.
  return {...selected,articleId:raw['articleId'],locale:language,status:'published',visibility:'public',localizations:raw['localizations']} as TContentHubRuntimeArticleSummary;
}
export function journalArticles(hub:unknown,language:string):TContentHubRuntimeArticleSummary[] {
  const raw=record(hub)['publicArticles'];const list=Array.isArray(raw)?raw:record(raw)['items'];
  if(!isFixedJournal(hub)||!Array.isArray(list)) return [];
  return list.map(value=>journalArticle(value,language)).filter((value):value is TContentHubRuntimeArticleSummary=>!!value)
    .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||(a.articleId<b.articleId?-1:a.articleId>b.articleId?1:0));
}
export function journalView(hub:unknown,path:string,language:string) {
  if(!isFixedJournal(hub)) return null;
  const all=journalArticles(hub,language);const segments=path.split('/').filter(Boolean);
  const series=segments[0]==='the-journal'&&segments.length>=2?journalSeries(segments[1],language):null;
  const chosen=series?all.filter(a=>a.categorySlug===series.slug):all;
  const current=all.find(a=>a.path===path)??null;
  const cards=(path==='/'?all.slice(0,3):chosen).map(a=>({...a,href:`${a.path}?lang=${language}`,
    seriesTitle:journalSeries(a.categorySlug??'',language)?.title??'',
    readLabel:language==='es'?'leer artículo':'read article',
    metaLabel:(journalSeries(a.categorySlug??'',language)?.title??'')+' · '+new Intl.DateTimeFormat(language==='es'?'es-MX':'en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(a.publishedAt)),
    dateLabel:new Intl.DateTimeFormat(language==='es'?'es-MX':'en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(a.publishedAt))}));
  const seriesLinks=Object.values(JOURNAL_SERIES).map(entry=>({title:entry[language==='es'?'es':'en'][1],href:'/the-journal/'+entry[language==='es'?'es':'en'][0]+'?lang='+language}));
  const currentMeta=cards.find(a=>a.articleId===current?.articleId)?.metaLabel??'';
  return {cards,empty:chosen.length===0,hasArticles:chosen.length>0,allCount:all.length,series,current,currentMeta,seriesLinks,
    currentDate:current?new Intl.DateTimeFormat(language==='es'?'es-MX':'en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(current.publishedAt)):'',
    backPath:`/the-journal?lang=${language}`};
}
export function journalLanguageUrl(hub:unknown,currentUrl:string,language:string):string|null {
  if(!isFixedJournal(hub)||!['en','es'].includes(language)) return null;
  const url=new URL(currentUrl),segments=url.pathname.split('/').filter(Boolean);
  if(segments[0]!=='the-journal'||segments.length<2) return null;
  if(segments.length===2) {
    const series=journalSeries(segments[1],'en')??journalSeries(segments[1],'es');
    url.pathname=series?'/the-journal/'+JOURNAL_SERIES[series.id as keyof typeof JOURNAL_SERIES][language as 'en'|'es'][0]:'/the-journal';
  } else {
    const source=[...journalArticles(hub,'en'),...journalArticles(hub,'es')].find(a=>a.path===url.pathname);
    const sibling=source?journalArticle(source,language):null;
    url.pathname=sibling?.path??'/the-journal';
  }
  url.searchParams.set('lang',language);url.hash='';return url.href;
}
export function journalAlternatePaths(hub:unknown,path:string):Record<string,string>|null {
  if(!isFixedJournal(hub)||!path.startsWith('/the-journal/')) return null;
  const source=[...journalArticles(hub,'en'),...journalArticles(hub,'es')].find(a=>a.path===path);
  if(source) return Object.fromEntries(['en','es'].map(lang=>[lang,journalArticle(source,lang)?.path]).filter((pair):pair is [string,string]=>!!pair[1]));
  const series=journalSeries(path.split('/')[2],'en')??journalSeries(path.split('/')[2],'es');
  if(series&&path.split('/').length===3) return Object.fromEntries(['en','es'].map(lang=>[lang,'/the-journal/'+JOURNAL_SERIES[series.id as keyof typeof JOURNAL_SERIES][lang as 'en'|'es'][0]]));
  return {};
}
