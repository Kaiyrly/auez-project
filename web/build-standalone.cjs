#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const imageTypes = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.avif': 'image/avif', '.ico': 'image/x-icon'
};

function isLocal(reference) {
  return !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference);
}

function localFile(reference) {
  const filename = path.resolve(root, decodeURIComponent(reference.split(/[?#]/, 1)[0]));
  if (!filename.startsWith(root + path.sep)) throw Error(`Asset outside web directory: ${reference}`);
  const real = fs.realpathSync(filename);
  if (!real.startsWith(root + path.sep)) throw Error(`Asset outside web directory: ${reference}`);
  return real;
}

function buildStandalone() {
  const images = new Map();
  const inlineImage = reference => {
    const extension = path.extname(reference.split(/[?#]/, 1)[0]).toLowerCase();
    if (!isLocal(reference) || !imageTypes[extension]) return reference;
    const filename = localFile(reference);
    if (!images.has(filename)) {
      images.set(filename, `data:${imageTypes[extension]};base64,${fs.readFileSync(filename).toString('base64')}`);
    }
    return images.get(filename);
  };
  // Includes image paths in HTML template literals and JS data arrays. The
  // presentation creates its logo dynamically, after the initial page loads.
  const inlineQuotedImages = source => source.replace(
    /(['"])([^'"\r\n]+?\.(?:png|jpe?g|webp|gif|svg|avif|ico)(?:[?#][^'"\r\n]*)?)\1/gi,
    (match, quote, reference) => `${quote}${inlineImage(reference)}${quote}`
  );
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  html = html.replace(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi,
    (tag, reference) => {
      if (!isLocal(reference)) return tag;
      const css = fs.readFileSync(localFile(reference), 'utf8').replace(
        /url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,
        (value, quote, asset) => `url(${quote}${inlineImage(asset)}${quote})`
      );
      if (/<\/style/i.test(css)) throw Error(`Unexpected closing style tag in ${reference}`);
      return `<style>\n${css}\n</style>`;
    });
  html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script\s*>/gi,
    (tag, before, reference, after) => {
      if (!isLocal(reference)) return tag;
      const source = inlineQuotedImages(fs.readFileSync(localFile(reference), 'utf8'));
      return `<script${before}${after}>\n${source.replace(/<\/script/gi, '<\\/script')}\n</script>`;
    });
  return inlineQuotedImages(html);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const outputIndex = args.indexOf('--output');
  if (args.some((arg, index) => arg !== '--check' && arg !== '--output' && !(outputIndex !== -1 && index === outputIndex + 1)) ||
      (outputIndex !== -1 && !args[outputIndex + 1])) {
    throw Error('Usage: node build-standalone.cjs [--check] [--output path]');
  }
  const output = outputIndex === -1 ? path.join(root, 'qalam.html') : path.resolve(args[outputIndex + 1]);
  const html = buildStandalone();
  if (check) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== html) {
      console.error('Standalone HTML is out of date. Run npm run build:standalone.');
      process.exitCode = 1;
    } else console.log('Standalone HTML is up to date.');
  } else {
    fs.writeFileSync(output, html);
    console.log(`Built ${path.basename(output)} (${Buffer.byteLength(html)} bytes).`);
  }
}

module.exports = { buildStandalone };
