import { chromium } from 'playwright-core';

const DEFAULT_DRAFTS = [
  'zoolandingpage.com.mx',
  'pamelabetancourt.com',
  'erosbarajas.com',
  'alecfest-voliii.com',
];

const DEFAULT_TARGETS = [
  ['local-dev', 'http://127.0.0.1:4201'],
  ['local-ssr', 'http://127.0.0.1:4300'],
  ['testing', 'https://test.zoolandingpage.com.mx'],
];

const checkpoints = [0, 500, 1000, 1500, 2000, 2500, 3000, 6000];

const args = new Set(process.argv.slice(2));
const includeTesting = !args.has('--local-only');
const targets = includeTesting ? DEFAULT_TARGETS : DEFAULT_TARGETS.filter(([label]) => label !== 'testing');
const drafts = process.env.ANGORA_AUDIT_DRAFTS?.split(',').map(entry => entry.trim()).filter(Boolean) ?? DEFAULT_DRAFTS;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

function buildUrl(origin, draftDomain) {
  const url = new URL(origin);
  url.searchParams.set('draftDomain', draftDomain);
  return url.toString();
}

async function collectState(page) {
  return page.evaluate(() => {
    const getRules = sheet => {
      try {
        return Array.from(sheet.cssRules ?? []).map(rule => String(rule.cssText ?? '').trim()).filter(Boolean);
      } catch {
        return [];
      }
    };

    const sheetEntries = Array.from(document.styleSheets)
      .filter(sheet => String(sheet.href ?? '').includes('angora-styles'))
      .map(sheet => {
        const rules = getRules(sheet);
        const counts = new Map();
        rules.forEach(rule => counts.set(rule, (counts.get(rule) ?? 0) + 1));
        return {
          href: sheet.href,
          ruleCount: rules.length,
          duplicateExactGroups: Array.from(counts.values()).filter(count => count > 1).length,
        };
      });

    const debug = window.__zlpAngoraDebug;
    const summary = debug?.cssCreateSummary?.() ?? null;
    const stylesheetAudit = debug?.stylesheetAudit?.(5) ?? null;
    const classTokens = Array.from(document.querySelectorAll('[class]'))
      .flatMap(element => Array.from(element.classList))
      .filter((value, index, list) => value && list.indexOf(value) === index);
    const classified = debug?.classifyClass
      ? classTokens.map(className => debug.classifyClass(className)).filter(Boolean)
      : [];
    const managedClasses = classified.filter(entry => entry?.managed).length;
    const comboClasses = classified.filter(entry => entry?.kind === 'combo').length;
    const h1 = document.querySelector('h1');
    const main = document.querySelector('main');
    const firstButton = document.querySelector('a[href], button');
    const buttonStyle = firstButton ? getComputedStyle(firstButton) : null;

    return {
      readyState: document.readyState,
      title: document.title,
      bodyTextLength: document.body?.innerText?.trim().length ?? 0,
      h1: h1?.textContent?.trim() ?? '',
      h1Color: h1 ? getComputedStyle(h1).color : '',
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      mainChildren: main?.children.length ?? 0,
      buttonDisplay: buttonStyle?.display ?? '',
      buttonBackground: buttonStyle?.backgroundColor ?? '',
      debugBridge: !!debug,
      summary,
      stylesheetAudit,
      sheetEntries,
      totalSheetRules: stylesheetAudit?.totalRules ?? sheetEntries.reduce((total, entry) => total + entry.ruleCount, 0),
      duplicateExactGroups: stylesheetAudit?.totalDuplicateExactGroups ?? sheetEntries.reduce((total, entry) => total + entry.duplicateExactGroups, 0),
      managedClasses,
      comboClasses,
    };
  });
}

async function auditUrl(browser, targetLabel, url) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const startedAt = Date.now();
  const records = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    for (const checkpoint of checkpoints) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < checkpoint) {
        await sleep(checkpoint - elapsed);
      }
      records.push({ ms: Date.now() - startedAt, state: await collectState(page) });
    }

    await page.evaluate(() => window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.65)));
    await sleep(750);
    records.push({ ms: Date.now() - startedAt, afterScroll: true, state: await collectState(page) });

    const cssReadyRecord = records.find(record => {
      const state = record.state;
      return (state.summary?.totalCreatedClasses ?? 0) > 0 || state.totalSheetRules > 0;
    });
    const last = records.at(-1)?.state;

    return {
      target: targetLabel,
      url,
      cssReadyAtMs: cssReadyRecord?.ms ?? null,
      final: {
        title: last?.title,
        h1: last?.h1,
        bodyTextLength: last?.bodyTextLength,
        totalSheetRules: last?.totalSheetRules,
        duplicateExactGroups: last?.stylesheetAudit?.totalDuplicateExactGroups ?? last?.duplicateExactGroups,
        cssCreateRuns: last?.summary?.totalRuns ?? null,
        cssCreateDurationMs: last?.summary?.totalDurationMs ?? null,
        totalCreatedClasses: last?.summary?.totalCreatedClasses ?? null,
        managedClasses: last?.managedClasses,
        comboClasses: last?.comboClasses,
        debugBridge: last?.debugBridge,
      },
      timeline: records.map(record => ({
        ms: record.ms,
        afterScroll: !!record.afterScroll,
        bodyTextLength: record.state.bodyTextLength,
        totalSheetRules: record.state.totalSheetRules,
        duplicateExactGroups: record.state.stylesheetAudit?.totalDuplicateExactGroups ?? record.state.duplicateExactGroups,
        cssCreateRuns: record.state.summary?.totalRuns ?? null,
        cssCreateDurationMs: record.state.summary?.totalDurationMs ?? null,
        totalCreatedClasses: record.state.summary?.totalCreatedClasses ?? null,
      })),
    };
  } catch (error) {
    return {
      target: targetLabel,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await page.close();
  }
}

const browser = await launchBrowser();
const results = [];

try {
  for (const draft of drafts) {
    for (const [targetLabel, origin] of targets) {
      results.push({
        draft,
        ...(await auditUrl(browser, targetLabel, buildUrl(origin, draft))),
      });
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  checkpoints,
  results,
}, null, 2));
