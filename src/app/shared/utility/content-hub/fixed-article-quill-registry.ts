import type Quill from 'quill';
import type { Registry } from 'parchment';
import type Image from 'quill/formats/image';

/** One editor instance only. Never register a format in Quill's global registry. */
export function createFixedArticleRegistry(quill:typeof Quill, sources:()=>readonly string[]):Registry {
  const {Registry}=quill.import('parchment') as typeof import('parchment');
  const registry=new Registry();
  for(const name of ['block','break','cursor','inline','scroll','text']) registry.register(quill.import('blots/'+name) as Parameters<Registry['register']>[0]);
  for(const name of ['bold','italic','header','list','list-container','blockquote','link']) registry.register(quill.import('formats/'+name) as Parameters<Registry['register']>[0]);
  const BaseImage=quill.import('formats/image') as typeof Image;
  class PrivateImage extends BaseImage {
    static override sanitize(url:string):string {
      // Reject pasted remote URLs, data URLs and unknown/stale Blob references before attaching to DOM.
      return url.startsWith('blob:') && sources().includes(url) ? url : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    }
    static override match(url:string):boolean {return url.startsWith('blob:') && sources().includes(url);}
    static override formats():Record<string,string> {return {};}
  }
  registry.register(PrivateImage);
  return registry;
}
