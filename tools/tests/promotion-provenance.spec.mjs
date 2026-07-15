import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  fetchAssociatedPullRequests,
  fetchTargetBranchSha,
  validatePromotionEvidence,
} from '../templates/draft-repo/tools/verify-promotion-commit.mjs';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const repository = 'LynxPardelle/draft-example-com';
const mergeSha = 'a'.repeat(40);
const baseSha = 'b'.repeat(40);
const headSha = 'c'.repeat(40);

function evidence(overrides = {}) {
  const pullRequest = {
    state: 'closed',
    merged_at: '2026-07-14T22:00:00Z',
    merge_commit_sha: mergeSha,
    base: { ref: 'test', repo: { full_name: repository } },
    head: { ref: 'dev', sha: headSha, repo: { full_name: repository } },
  };
  return {
    repository,
    sha: mergeSha,
    ref: 'refs/heads/test',
    sourceBranch: 'dev',
    targetBranch: 'test',
    eventName: 'push',
    event: {
      after: mergeSha,
      before: baseSha,
      created: false,
      deleted: false,
      forced: false,
    },
    targetTipSha: mergeSha,
    parents: [baseSha, headSha],
    pullRequests: [pullRequest],
    ...overrides,
  };
}

test('accepts an exact same-repository dev-to-test merge push', () => {
  assert.doesNotThrow(() => validatePromotionEvidence(evidence()));
});

test('accepts GitHub API 2026 associated PRs when merge_commit_sha is null or absent', () => {
  const withNull = evidence().pullRequests[0];
  withNull.merge_commit_sha = null;
  assert.doesNotThrow(() => validatePromotionEvidence(evidence({ pullRequests: [withNull] })));

  const withoutField = structuredClone(evidence().pullRequests[0]);
  delete withoutField.merge_commit_sha;
  assert.doesNotThrow(() => validatePromotionEvidence(evidence({ pullRequests: [withoutField] })));
});

test('rejects an associated PR when a provided merge_commit_sha points elsewhere', () => {
  const incorrectAssociation = evidence().pullRequests[0];
  incorrectAssociation.merge_commit_sha = 'd'.repeat(40);
  assert.throws(
    () => validatePromotionEvidence(evidence({ pullRequests: [incorrectAssociation] })),
    /promotion_pr_not_found/,
  );
});

test('rejects a synthetic merge that uses an older allowed source ancestor', () => {
  assert.throws(
    () => validatePromotionEvidence(evidence({ parents: [baseSha, 'd'.repeat(40)] })),
    /promotion_second_parent_mismatch/,
  );
});

test('rejects direct, forced, created, and deleted pushes', () => {
  assert.throws(
    () => validatePromotionEvidence(evidence({ parents: [baseSha] })),
    /promotion_merge_commit_required/,
  );
  for (const field of ['forced', 'created', 'deleted']) {
    assert.throws(
      () => validatePromotionEvidence(evidence({ event: { ...evidence().event, [field]: true } })),
      /promotion_push_not_allowed/,
    );
  }
});

test('rejects squash and rebase promotions because they are not exact two-parent merges', () => {
  for (const parents of [[baseSha], ['d'.repeat(40)]]) {
    assert.throws(
      () => validatePromotionEvidence(evidence({ parents })),
      /promotion_merge_commit_required/,
    );
  }
});

test('rejects a merge whose push before SHA is not its first parent', () => {
  assert.throws(
    () => validatePromotionEvidence(evidence({ event: { ...evidence().event, before: 'e'.repeat(40) } })),
    /promotion_first_parent_mismatch/,
  );
});

test('rejects a valid historical promotion commit that is no longer the target tip', () => {
  assert.throws(
    () => validatePromotionEvidence(evidence({ targetTipSha: 'f'.repeat(40) })),
    /promotion_target_tip_mismatch/,
  );
});

test('rejects rollback reuse when the push predecessor is not the merge first parent', () => {
  assert.throws(
    () => validatePromotionEvidence(evidence({
      event: { ...evidence().event, before: 'f'.repeat(40) },
    })),
    /promotion_first_parent_mismatch/,
  );
});

test('rejects wrong source, target, repository, or ambiguous PR evidence', () => {
  const valid = evidence().pullRequests[0];
  for (const pullRequest of [
    { ...valid, head: { ...valid.head, ref: 'feature' } },
    { ...valid, base: { ...valid.base, ref: 'main' } },
    { ...valid, head: { ...valid.head, repo: { full_name: 'someone/fork' } } },
  ]) {
    assert.throws(
      () => validatePromotionEvidence(evidence({ pullRequests: [pullRequest] })),
      /promotion_pr_not_found/,
    );
  }
  assert.throws(
    () => validatePromotionEvidence(evidence({ pullRequests: [valid, structuredClone(valid)] })),
    /promotion_pr_ambiguous/,
  );
});

test('accepts manual dispatch only when the current tip is the exact merged PR commit', () => {
  assert.doesNotThrow(() => validatePromotionEvidence(evidence({
    eventName: 'workflow_dispatch',
    event: {},
  })));
  assert.throws(
    () => validatePromotionEvidence(evidence({
      eventName: 'workflow_dispatch',
      event: {},
      sha: 'f'.repeat(40),
    })),
    /promotion_target_tip_mismatch/,
  );
});

test('retries empty associated-PR responses and returns the first non-empty response', async () => {
  let calls = 0;
  let requestedUrl;
  const expected = evidence().pullRequests;
  const result = await fetchAssociatedPullRequests({
    apiUrl: 'https://api.github.com',
    repository,
    sha: mergeSha,
    githubToken: 'synthetic-test-token',
    attempts: 3,
    retryDelayMs: 0,
    sleep: async () => {},
    fetchImpl: async url => {
      calls += 1;
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => calls < 3 ? [] : expected,
      };
    },
  });
  assert.equal(calls, 3);
  assert.equal(
    requestedUrl.href,
    `https://api.github.com/repos/LynxPardelle/draft-example-com/commits/${mergeSha}/pulls?per_page=100`,
  );
  assert.deepEqual(result, expected);
});

test('fails closed on an API error without exposing its response body', async () => {
  const sentinel = 'do-not-print-upstream-body';
  await assert.rejects(
    fetchAssociatedPullRequests({
      apiUrl: 'https://api.github.com',
      repository,
      sha: mergeSha,
      githubToken: 'synthetic-test-token',
      attempts: 3,
      retryDelayMs: 0,
      sleep: async () => {},
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: sentinel }),
      }),
    }),
    error => error?.message === 'promotion_api_unavailable' && !String(error).includes(sentinel),
  );
});

test('reads the exact current target branch SHA and rejects malformed evidence', async () => {
  const common = {
    apiUrl: 'https://api.github.com',
    repository,
    targetBranch: 'test',
    githubToken: 'synthetic-test-token',
    attempts: 1,
    retryDelayMs: 0,
    sleep: async () => {},
  };
  assert.equal(await fetchTargetBranchSha({
    ...common,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ commit: { sha: mergeSha } }),
    }),
  }), mergeSha);
  await assert.rejects(fetchTargetBranchSha({
    ...common,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ commit: { sha: 'not-a-sha' } }),
    }),
  }), /promotion_api_invalid_response/);
});

test('deploy templates request read-only PR metadata and invoke the verifier without OIDC', async () => {
  const verifier = await readFile(
    path.join(repoRoot, 'tools', 'templates', 'draft-repo', 'tools', 'verify-promotion-commit.mjs'),
    'utf8',
  );
  assert.match(verifier, /'X-GitHub-Api-Version': '2026-03-10'/);
  assert.doesNotMatch(verifier, /2022-11-28/);

  for (const [name, sourceBranch, targetBranch] of [
    ['deploy-test.yml', 'dev', 'test'],
    ['deploy-production.yml', 'test', 'main'],
  ]) {
    const workflow = await readFile(
      path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', name),
      'utf8',
    );
    const topLevelPermissions = workflow.slice(
      workflow.indexOf('permissions:'),
      workflow.indexOf('\njobs:'),
    );
    assert.match(topLevelPermissions, /contents:\s*read/);
    assert.match(topLevelPermissions, /pull-requests:\s*read/);
    assert.doesNotMatch(topLevelPermissions, /id-token:\s*write/);
    assert.match(workflow, /node tools\/verify-promotion-commit\.mjs/);
    assert.match(workflow, new RegExp(`--source=${sourceBranch}`));
    assert.match(workflow, new RegExp(`--target=${targetBranch}`));
    assert.match(workflow, /--tip-only=true/);
    assert.match(workflow, /concurrency:[\s\S]*cancel-in-progress:\s*true/);
    assert.ok(
      workflow.indexOf('concurrency:') > workflow.indexOf('\n  deploy:'),
      `${name} must serialize only the privileged deploy job so an invalid historical rerun cannot cancel validation`,
    );
    assert.doesNotMatch(workflow, /HEAD\^2|merge-base --is-ancestor/);
    assert.ok(
      workflow.indexOf('actions/setup-node@v5') < workflow.indexOf('node tools/verify-promotion-commit.mjs'),
      `${name} must select its pinned Node runtime before running the provenance verifier`,
    );
  }
});
