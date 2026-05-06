import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const zooSiteConfig = readJson('drafts/zoolandingpage.com.mx/site-config.json');
const zooVariables = readJson('drafts/zoolandingpage.com.mx/default/variables.json');
const alecfestSiteConfig = readJson('drafts/alecfest-voliii.com/site-config.json');
const pamelaSiteConfig = readJson('drafts/pamelabetancourt.com/site-config.json');
const indexHtml = readFileSync('src/index.html', 'utf8');

const expectedZooDark = {
  bgColor: '#1a1a1a',
  textColor: '#ffffff',
  titleColor: '#d8dadbff',
  linkColor: '#66b3ff',
  accentColor: '#225783ff',
  secondaryBgColor: '#2d2d2d',
  secondaryTextColor: '#d9dcdfff',
  secondaryTitleColor: '#6cc3e6ff',
  secondaryLinkColor: '#30a464ff',
  secondaryAccentColor: '#20673cff',
};

const expectedAlecfestDark = {
  bgColor: '#070807',
  textColor: '#ddd8ca',
  titleColor: '#eefb90',
  linkColor: '#ffd447',
  accentColor: '#97f23d',
  secondaryBgColor: '#12160f',
  secondaryTextColor: '#f4eedc',
  secondaryTitleColor: '#fff8d6',
  secondaryLinkColor: '#c1ff69',
  secondaryAccentColor: '#394f13',
};

const expectedPamelaLight = {
  bgColor: '#f4e7e1',
  textColor: '#5b4d47',
  titleColor: '#734332',
  linkColor: '#734332',
  accentColor: '#734332',
  secondaryBgColor: '#dfc1b4',
  secondaryTextColor: '#433733',
  secondaryTitleColor: '#734332',
  secondaryLinkColor: '#734332',
  secondaryAccentColor: '#734332',
};

const expectedPamelaDark = {
  bgColor: '#1f1917',
  textColor: '#efe2db',
  titleColor: '#f6d0bf',
  linkColor: '#e2a27f',
  accentColor: '#cf7f59',
  secondaryBgColor: '#2b211e',
  secondaryTextColor: '#e8d7cf',
  secondaryTitleColor: '#f5c3aa',
  secondaryLinkColor: '#e2a27f',
  secondaryAccentColor: '#cf7f59',
};

function rgb(hex) {
  const clean = hex.replace('#', '').slice(0, 6);
  assert.match(clean, /^[0-9a-f]{6}$/i, `Expected a 6-digit hex color, got ${hex}`);
  return [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const left = luminance(a);
  const right = luminance(b);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function assertPalette(name, actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(actual[key], value, `${name}.${key}`);
  }

  assert.ok(contrast(actual.bgColor, actual.textColor) >= 4.5, `${name} body text contrast`);
  assert.ok(contrast(actual.bgColor, actual.titleColor) >= 4.5, `${name} title contrast`);
  assert.ok(contrast(actual.secondaryBgColor, actual.secondaryTextColor) >= 4.5, `${name} card text contrast`);
  assert.ok(contrast(actual.secondaryBgColor, actual.secondaryTitleColor) >= 4.5, `${name} card title contrast`);
  if (name.startsWith('zoolandingpage.com.mx')) {
    assert.ok(contrast(actual.accentColor, actual.textColor) >= 4.5, `${name} accent section text contrast`);
    assert.ok(contrast(actual.accentColor, actual.titleColor) >= 4.5, `${name} accent section title contrast`);
  } else {
    assert.ok(contrast(actual.accentColor, actual.bgColor) >= 4.5, `${name} accent button text contrast`);
  }
}

test('dark draft palettes keep brand colors and readable contrast', () => {
  assertPalette('zoolandingpage.com.mx.dark', zooSiteConfig.site.theme.palettes.dark, expectedZooDark);
  assertPalette('alecfest-voliii.com.dark', alecfestSiteConfig.site.theme.palettes.dark, expectedAlecfestDark);
  assertPalette('pamelabetancourt.com.dark', pamelaSiteConfig.site.theme.palettes.dark, expectedPamelaDark);
});

test('Pamela light palette keeps the Google Sites color anchor', () => {
  assertPalette('pamelabetancourt.com.light', pamelaSiteConfig.site.theme.palettes.light, expectedPamelaLight);
});

test('Zoo boot curtain carries the requested product name and domain', () => {
  assert.equal(zooVariables.variables.ui.loadingCurtain.title, 'Zoo Landing Page');
  assert.equal(zooVariables.variables.ui.loadingCurtain.subtitle, 'zoolandingpage.com.mx');
  assert.match(indexHtml, />Zoo Landing Page</);
  assert.match(indexHtml, />zoolandingpage\.com\.mx</);
});
