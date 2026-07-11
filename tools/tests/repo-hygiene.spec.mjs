import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const reusableSafetyWorkflow = fileURLToPath(
  new URL('../../.github/workflows/reusable-pr-safety.yml', import.meta.url)
);

function listTrackedFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
}

test('repository does not track local Superpowers artifacts', () => {
  const blocked = listTrackedFiles().filter((filePath) => (
    filePath === '.superpowers'
    || filePath.startsWith('.superpowers/')
    || filePath === 'docs/superpowers'
    || filePath.startsWith('docs/superpowers/')
  ));

  assert.deepEqual(blocked, []);
});

test('reusable PR safety workflow is pinned and read-only', () => {
  assert.equal(
    existsSync(reusableSafetyWorkflow),
    true,
    '.github/workflows/reusable-pr-safety.yml must exist'
  );

  const workflow = readFileSync(reusableSafetyWorkflow, 'utf8');
  const checkoutSha = 'df4cb1c069e1874edd31b4311f1884172cec0e10';

  assert.match(workflow, /workflow_call:/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.match(workflow, /timeout-minutes: 10/);
  assert.equal(workflow.match(new RegExp(`actions/checkout@${checkoutSha}`, 'g'))?.length, 2);
  assert.match(workflow, /ref: d8494f0ae446a51d5ca9740a4831635e43bd5a79/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.equal(workflow.match(/persist-credentials: false/g)?.length, 2);
  assert.match(workflow, /8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8/);
  assert.match(workflow, /551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb/);
  assert.match(workflow, /draft-public-safety-audit\.mjs --repo=caller --history=true/);
  assert.match(workflow, /GITLEAKS_CONFIG_TOML:[\s\S]*useDefault = true/);
  assert.match(workflow, /gitleaks git --log-opts="--all" --redact/);
  assert.doesNotMatch(workflow, /^\s+(?:environment|id-token|secrets):/m);
  assert.doesNotMatch(workflow, /^\s+(?:pull_request|push|workflow_dispatch):/m);
  assert.doesNotMatch(workflow, /aws-actions|\baws\b/i);
});
