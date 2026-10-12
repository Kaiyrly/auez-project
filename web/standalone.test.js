'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { buildStandalone } = require('./build-standalone.cjs');

const root = __dirname;
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const local = reference => !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference);

test('both downloadable entrypoints stay synchronized with the sources and deterministic', () => {
  const output = buildStandalone();
  const expected = hash(output);
  assert.equal(hash(buildStandalone()), expected, 'rebuilding the same sources changes output');
  for (const entrypoint of ['index.html', 'qalam.html']) {
    assert.equal(hash(fs.readFileSync(path.join(root, entrypoint))), expected, `${entrypoint} needs rebuilding`);
  }
});

test('an isolated index.html contains its styles, scripts, school logo and all nine original photos', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const dependencies = [];
  for (const tag of html.matchAll(/<(?:link|script|img)\b[^>]*>/gi)) {
    for (const attribute of tag[0].matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
      if (local(attribute[1])) dependencies.push(attribute[1]);
    }
  }
  assert.deepEqual(dependencies, [], 'isolated HTML must not request neighbouring styles/scripts/images');
  assert.match(html, /<style[\s>]/i, 'styles must be embedded');
  assert.match(html, /<script[\s>]/i, 'scripts must be embedded');
  assert.ok(!/(['"])assets\/project-progress\/[^'"]+\.jpe?g\1/i.test(html), 'dynamic gallery paths must be embedded too');

  const embeddedPhotos = new Set([...html.matchAll(/data:image\/jpeg;base64,([A-Za-z\d+/=]+)/g)]
    .map(match => hash(Buffer.from(match[1], 'base64'))));
  const folder = path.join(root, 'assets/project-progress');
  const originals = fs.readdirSync(folder).filter(name => /\.jpe?g$/i.test(name));
  assert.equal(originals.length, 9, 'all nine supplied originals must be present');
  assert.equal(embeddedPhotos.size, 9, 'all nine distinct photos must be embedded');
  for (const filename of originals) {
    assert.ok(embeddedPhotos.has(hash(fs.readFileSync(path.join(folder, filename)))), `${filename} is missing or changed in the standalone HTML`);
  }
  const logoHash = hash(fs.readFileSync(path.join(root, 'school-logo.png')));
  const embeddedLogos = [...html.matchAll(/data:image\/png;base64,([A-Za-z\d+/=]+)/g)]
    .filter(match => hash(Buffer.from(match[1], 'base64')) === logoHash);
  assert.equal(embeddedLogos.length, 3, 'favicon, masthead and dynamically created presentation logo must be embedded');
});

test('builder checks both entrypoints and custom output never replaces them', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qalam-entrypoints-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.copyFileSync(path.join(root, 'build-standalone.cjs'), path.join(dir, 'build-standalone.cjs'));
  fs.writeFileSync(path.join(dir, 'index.template.html'), '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><h1>Qalam</h1><script src="app.js"></script></body></html>');
  fs.writeFileSync(path.join(dir, 'style.css'), 'body { color: green; }');
  fs.writeFileSync(path.join(dir, 'app.js'), 'const $$ = "preserved";');
  const run = (...args) => spawnSync(process.execPath, ['build-standalone.cjs', ...args], { cwd: dir, encoding: 'utf8' });
  assert.equal(run().status, 0);
  const index = path.join(dir, 'index.html');
  const qalam = path.join(dir, 'qalam.html');
  const expected = fs.readFileSync(index, 'utf8');
  assert.equal(fs.readFileSync(qalam, 'utf8'), expected);
  assert.ok(expected.includes('const $$ = "preserved";'));
  assert.equal(run('--check').status, 0);

  fs.writeFileSync(index, '<p>stale index</p>');
  const staleIndex = run('--check');
  assert.equal(staleIndex.status, 1);
  assert.match(staleIndex.stderr, /index\.html/);
  fs.writeFileSync(index, expected);
  fs.unlinkSync(qalam);
  const missingQalam = run('--check');
  assert.equal(missingQalam.status, 1);
  assert.match(missingQalam.stderr, /qalam\.html/);

  const custom = path.join(dir, 'preview.html');
  assert.equal(run('--output', custom).status, 0);
  assert.equal(fs.readFileSync(custom, 'utf8'), expected);
  assert.equal(fs.readFileSync(index, 'utf8'), expected);
  assert.ok(!fs.existsSync(qalam), 'custom output unexpectedly regenerated the default output');
  assert.equal(run('--check', '--output', custom).status, 0);
});
