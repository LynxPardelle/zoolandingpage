import { TestBed } from '@angular/core/testing';

import { GenericEmbedFrameComponent } from './generic-embed-frame.component';
import type { TGenericEmbedFrameConfig } from './generic-embed-frame.types';

describe('GenericEmbedFrameComponent', () => {
  it('renders forms with an immutable iframe security policy', async () => {
    await TestBed.configureTestingModule({
      imports: [GenericEmbedFrameComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(GenericEmbedFrameComponent);
    const config: TGenericEmbedFrameConfig = {
      id: 'contact-form',
      src: 'about:blank',
      title: 'Contact form',
      allow: 'camera *',
      referrerPolicy: 'no-referrer',
      sandbox: 'allow-scripts',
      allowFullscreen: true,
    };
    fixture.componentRef.setInput('config', config);

    expect(() => fixture.detectChanges()).not.toThrow();

    const iframe: HTMLIFrameElement | null = fixture.nativeElement.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe?.getAttribute('sandbox')).toBe(
      'allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts'
    );
    expect(iframe?.getAttribute('allow')).toBeNull();
    expect(iframe?.getAttribute('allowfullscreen')).toBeNull();
  });
});
