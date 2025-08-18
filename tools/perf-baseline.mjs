#!/usr/bin/env node
/**
 * Simple performance/bundle size baseline reporter.
 * 1. Runs `ng build --configuration production` (if not already built)
 * 2. Scans dist/ for JS bundles, collecting size (raw + gzip)
 * 3. Emits JSON report to perf-baseline.report.json and prints summary table
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createGzip } from 'node:zlib';

const DIST_ROOT = 'dist';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function gzipSize(buf) {
  return new Promise(resolve => {
    const gz = createGzip();
    const chunks = [];
    gz.on('data', c => chunks.push(c));
    gz.on('end', () => resolve(Buffer.concat(chunks).length));
    gz.end(buf);
  });
}

async function collect() {
  if (!existsSync(DIST_ROOT)) {
    console.log('No dist folder found – running production build...');
    run('npm run build');
  }
  // Find first project folder inside dist (Angular CLI structure)
  const distEntries = readdirSync(DIST_ROOT);
  const projectDir = distEntries.find(e => statSync(join(DIST_ROOT, e)).isDirectory());
  if (!projectDir) throw new Error('Unable to locate built project directory under dist/');
  const root = join(DIST_ROOT, projectDir);
  const assets = [];
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (extname(entry) === '.js') assets.push(full);
    }
  }
  walk(root);
  const results = [];
  for (const file of assets) {
    const buf = readFileSync(file);
    const gz = await gzipSize(buf);
    results.push({
      file: file.replace(root + '\\', ''),
      bytes: buf.length,
      gzip: gz,
    });
  }
  results.sort((a, b) => b.bytes - a.bytes);
  const total = results.reduce((s, r) => s + r.bytes, 0);
  const totalGzip = results.reduce((s, r) => s + r.gzip, 0);
  const report = {
    generatedAt: new Date().toISOString(),
    project: projectDir,
    bundles: results,
    totalBytes: total,
    totalGzipBytes: totalGzip,
  };
  writeFileSync('perf-baseline.report.json', JSON.stringify(report, null, 2));
  console.log('\nBundle Size Baseline');
  console.log('='.repeat(60));
  for (const r of results) {
    console.log(
      r.file.padEnd(40) +
        (r.bytes / 1024).toFixed(1).padStart(10) +
        ' KB  ' +
        (r.gzip / 1024).toFixed(1).padStart(8) +
        ' KB gzip'
    );
  }
  console.log('-'.repeat(60));
  console.log(
    'TOTAL'.padEnd(40) +
      (total / 1024).toFixed(1).padStart(10) +
      ' KB  ' +
      (totalGzip / 1024).toFixed(1).padStart(8) +
      ' KB gzip'
  );
  console.log('\nReport written to perf-baseline.report.json');
}

collect().catch(err => {
  console.error('perf:baseline failed:', err);
  process.exit(1);
});
