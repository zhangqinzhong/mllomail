const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

test('clean Pages builds get offline settings without overwriting an existing project', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'mllomail-build-'));
  const script = resolve('scripts/prepare-pages-build.mjs');
  try {
    execFileSync(process.execPath, [script], { cwd });
    const file = join(cwd, '.vercel/project.json');
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), {
      projectId: '_', orgId: '_', settings: { framework: 'nextjs', installCommand: 'true' }
    });
    const existing = JSON.stringify({ projectId: 'existing-project', settings: { framework: 'nextjs' } });
    writeFileSync(file, existing);
    execFileSync(process.execPath, [script], { cwd });
    assert.equal(readFileSync(file, 'utf8'), existing);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
