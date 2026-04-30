import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const styles = readFileSync('src/styles.scss', 'utf8');

test('global critical CSS covers first-viewport Angora layout utilities', () => {
  const requiredSelectors = [
    '.ank-ai-start',
    '.ank-as-start',
    '.ank-alignSelf-start',
    '.ank-d-lg-grid',
    '.ank-display-lg-grid',
    '.ank-d-lg-none',
    '.ank-display-lg-none',
    '.ank-fwr-wrap',
    '.ank-pos-sticky',
    '.ank-position-sticky',
    '.ank-width-100per',
    '.ank-paddingInline-24px',
    '.ank-paddingBlock-12px',
    '.ank-p-22px',
    '.ank-gtc-1fr__1fr',
    '.ank-h-50per',
    '.ank-wmx-1180px',
    '.ank-wmx-1480px',
    '.sectionBase',
    '.sectionEyebrow',
    '.sectionTitle',
    '.sectionSubtitle',
    '.chipText',
    '.heroCaption',
    'img.ank-h-50per[width][height]',
    '#heroBadge-container',
  ];

  const missing = requiredSelectors.filter(selector => !styles.includes(selector));

  assert.deepEqual(missing, []);
});

test('generic media images keep their intrinsic aspect ratio when utility widths scale them', () => {
  assert.match(
    styles,
    /generic-media\s+img\[width\]\[height\]\s*{[^}]*height:\s*auto;/s,
  );
});
