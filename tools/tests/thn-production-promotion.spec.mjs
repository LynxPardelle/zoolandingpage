import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const moduleUrl = new URL('../verify-thn-production-promotion.mjs', import.meta.url);
const sourceSha = 'a'.repeat(40), sourceTree = 'b'.repeat(40), targetBaseSha = 'c'.repeat(40), mergeTree = 'd'.repeat(40), sha = 'e'.repeat(40);
const selector = { schemaVersion: 1, mode: 'thn-source-only', sourceSha, sourceTree, targetBaseSha, mergeTree };
const context = { eventName: 'push', ref: 'refs/heads/main', sha, parents: [targetBaseSha, sourceSha], sourceSha, sourceTree, mergeTree,
  event: { before: targetBaseSha, after: sha, forced: false, created: false, deleted: false } };
test('production source-only gate requires the exact native merge tree and current TEST coordinates', async () => {
  assert.ok(existsSync(moduleUrl), 'production promotion needs an executable fail-closed selector before credentials');
  const { validateSourceOnlyPromotion } = await import(moduleUrl.href);
  assert.deepEqual(validateSourceOnlyPromotion(selector, context), { sourceOnly: true });
  for (const mutate of [s => s.sourceSha = sha, s => s.sourceTree = sha, s => s.targetBaseSha = sha, s => s.mergeTree = sha,
    s => s.mode = 'deploy', s => s.schemaVersion = 2, s => s.extra = true]) {
    const changed = structuredClone(selector); mutate(changed);
    assert.throws(() => validateSourceOnlyPromotion(changed, context), /production_promotion_/);
  }
  for (const changed of [undefined, {}, { ...selector, sourceSha: 'a' }, JSON.stringify(selector)]) assert.throws(() => validateSourceOnlyPromotion(changed, context), /production_promotion_/);
  for (const changed of [{ ...context, ref: 'refs/heads/test' }, { ...context, parents: [sourceSha, targetBaseSha] }, { ...context, eventName: 'workflow_dispatch' },
    { ...context, event: { ...context.event, forced: true } }, { ...context, sourceTree: sha }, { ...context, mergeTree: sha }]) assert.throws(() => validateSourceOnlyPromotion(selector, changed), /production_promotion_/);
});
test('source-only promotion skips build and credential publication while mandatory Angular CI remains enabled', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/publish-ssr-artifact.yml', import.meta.url), 'utf8');
  assert.match(workflow, /PRODUCTION_PROMOTION_SELECTION_JSON: \$\{\{ vars.APP_PRODUCTION_PROMOTION_SELECTION_JSON \}\}/);
  assert.match(workflow, /source_only: \$\{\{ steps.release_mode.outputs.source_only \}\}/);
  assert.match(workflow.split('  publish:')[1], /if: needs.validate.outputs.source_only != 'true'/);
  assert.ok(workflow.indexOf('node tools/verify-thn-production-promotion.mjs') < workflow.indexOf('npm ci'));
  const ci = await readFile(new URL('../../.github/workflows/angular-validate.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(ci, /source_only|APP_PRODUCTION_PROMOTION_SELECTION_JSON/);
});
test('canonical and template readiness agree on a separately projected production descriptor', async () => {
  const { projectThnDraftEnvironment } = await import('../templates/draft-repo/tools/lib/thn-draft-environment.mjs');
  const { validateDraftFeatureReadiness } = await import('../draft-feature-readiness.mjs');
  const template = await import('../templates/draft-repo/tools/draft-feature-readiness.mjs');
  const domain = 'thehairnarrative.com';
  const files = [{path:`${domain}/site-config.json`,kind:'site-config',content:{version:1,domain,runtime:{authRemote:{authProfileId:'journal-owner',requiredOrigin:'https://admin-test.thehairnarrative.com'}}}},
    {path:`${domain}/server/protected-feature-bindings-v2.json`,kind:'server-protected-feature-bindings-v2',content:{bindingId:'journal-v2',domain,environment:'test',authProfileId:'journal-owner',featureId:'journal',hubId:'thehairnarrative-com-journal',serviceBindingId:'thn-journal-test-v2',authBasePath:'/auth-v2',contentHubBasePath:'/features/content-hub-v2',status:'active'}}];
  const production = projectThnDraftEnvironment({domain,environment:'production',files});
  for(const validate of [validateDraftFeatureReadiness,template.validateDraftFeatureReadiness]) {
    assert.equal((await validate({domain,environment:'production',mode:'production',files:production})).ok,true);
    assert.equal((await validate({domain,environment:'production',mode:'production',files})).ok,false);
    assert.equal((await validate({domain,environment:'test',mode:'test',files:production})).ok,false);
  }
});


test('raw selector rejects duplicate coordinates including escaped JSON keys', async () => {
  const module = await import(moduleUrl.href);
  assert.equal(typeof module.parseSourceOnlyPromotionSelection, 'function', 'raw workflow selectors need duplicate-key rejection before JSON values are collapsed');
  const valid = JSON.stringify(selector);
  assert.deepEqual(module.parseSourceOnlyPromotionSelection(valid), selector);
  assert.deepEqual(module.parseSourceOnlyPromotionSelection('  '+valid+'\n'), selector);
  for (const duplicate of ['sourceSha', 'sourceTree', 'targetBaseSha', 'mergeTree', 'mode', 'schemaVersion']) {
    const raw = '{'+JSON.stringify(duplicate)+':null,'+valid.slice(1);
    assert.throws(() => module.parseSourceOnlyPromotionSelection(raw), /production_promotion_/);
  }
  const escaped = '{"source\\u0053ha":null,'+valid.slice(1);
  assert.throws(() => module.parseSourceOnlyPromotionSelection(escaped), /production_promotion_/);
  for(const invalid of ['', 'null', '[]', '{"sourceSha":{}}', valid+' trailing', '{"sourceSha":1,"sourceSha":2}']) {
    assert.throws(() => module.parseSourceOnlyPromotionSelection(invalid), /production_promotion_/);
  }
});


test('CLI rejects duplicate raw selection before requesting remote evidence', () => {
  const raw = '{"sourceSha":null,'+JSON.stringify(selector).slice(1);
  const script = `globalThis.fetch=()=>{console.log('REMOTE_EVIDENCE_REQUESTED');throw Error('unexpected remote call')};process.argv[1]=${JSON.stringify(fileURLToPath(moduleUrl))};await import(${JSON.stringify(moduleUrl.href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module','-e',script], {encoding:'utf8',env:{...process.env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:'Toydrum/draft-thehairnarrative-com',GITHUB_TOKEN:'synthetic-test-token',PRODUCTION_PROMOTION_SELECTION_JSON:raw}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/production_promotion_selection_invalid/);
  assert.doesNotMatch(result.stdout,/REMOTE_EVIDENCE_REQUESTED/);
});
