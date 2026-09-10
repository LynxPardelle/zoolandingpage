import { FixedArticleMedia, preparePrivateImage } from './fixed-article-media';
import { FixedArticleClient } from './fixed-article-client';
import { FixedArticleEditor } from '../../../state/blog/fixed-article-editor';

describe('Fixed article private media in the browser', () => {
  function workflow() {
    const editor = new FixedArticleEditor({save:async()=>{throw new Error('not used');}});
    editor.open({articleId:'article-1',concurrencyToken:'token',seriesId:'form-movement',locales:{}},'en');
    const asset = {assetId:'asset-1',status:'ready',contentType:'image/png',imageBase64:'iVBORw0KGgo=',width:1,height:1,alt:'Hair'};
    const client = {read:async()=>({items:[asset]})} as unknown as FixedArticleClient;
    return new FixedArticleMedia(client,editor,preparePrivateImage,{create:()=> 'blob:https://admin.example.test/private',revoke:()=>{}});
  }

  it('normalizes real browser PNG pixels to a bounded image without an external upload', async () => {
    const source=document.createElement('canvas');source.width=2400;source.height=1800;
    source.getContext('2d')!.fillRect(0,0,2400,1800);
    const blob=await new Promise<Blob>(resolve=>source.toBlob(value=>resolve(value!),'image/png'));
    const normalized=await preparePrivateImage(blob);
    expect(normalized.contentType).toBe('image/webp');
    const raw=Uint8Array.from(atob(normalized.imageBase64),c=>c.charCodeAt(0));
    const bitmap=await createImageBitmap(new Blob([raw],{type:normalized.contentType}));
    expect([bitmap.width,bitmap.height]).toEqual([1600,1200]);bitmap.close();
    expect(Object.keys(normalized).sort()).toEqual(['contentType','imageBase64']);
  });

  it('hydrates only inert private asset references using memory-only previews', async () => {
    const w=workflow();
    const rendered=await w.hydratePreview('<p>A letter</p><figure><img data-private-asset="asset-1" alt="Hair"></figure>');
    expect(rendered).toContain('src="blob:https://admin.example.test/private"');
    expect(rendered).not.toContain('data-private-asset');
    w.destroy();
  });

  it('rejects unexpected active markup and existing source URLs before hydration', async () => {
    const w=workflow();
    for (const html of ['<script>window.evil=true</script>', '<img src="https://example.test/private">',
                        '<p style="background:red">x</p>', '<a href="javascript:alert(1)">x</a>',
                        '<iframe src="https://example.test"></iframe>', '<img data-private-asset="asset-1" onerror="alert(1)">']) {
      await expectAsync(w.hydratePreview(html)).toBeRejectedWithError('invalid_preview_markup');
    }
    w.destroy();
  });
});
