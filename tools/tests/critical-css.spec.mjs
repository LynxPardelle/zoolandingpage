import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const styles = readFileSync('src/styles.scss', 'utf8');

test('global styles do not hardcode Angora utilities or draft combo classes', () => {
  const forbiddenPatterns = [
    /\.ank-[A-Za-z0-9_-]+\s*[{,.#\[]/,
    /img\.ank-/,
    /\.sectionBase\s*{/,
    /\.sectionEyebrow\s*{/,
    /\.sectionTitle\s*{/,
    /\.sectionSubtitle\s*{/,
    /\.chipText\s*{/,
    /\.heroCaption\s*{/,
    /\.btnBaseVAL/,
  ];

  const matchedPattern = forbiddenPatterns.find((pattern) => pattern.test(styles));

  assert.equal(matchedPattern, undefined);
});

test('generic media images keep their intrinsic aspect ratio when utility widths scale them', () => {
  assert.match(
    styles,
    /generic-media\s+img\[width\]\[height\]\s*{[^}]*height:\s*auto;/s,
  );
});
