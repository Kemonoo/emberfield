#!/usr/bin/env node
// Build the GitHub Pages site in docs/ from studio.html + the engine.
// studio.html is written as an artifact body (no <html>/<head>), so wrap it in a document here.
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), docs = path.join(root, 'docs');
fs.mkdirSync(docs, { recursive: true });

const favicon = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#131316"/>' +
  '<path d="M5 22c6-1 8-10 14-11s7 4 8 4" stroke="#ff2d4a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
  '<path d="M5 15c5-1 6-6 11-6" stroke="#b31d33" stroke-width="2" fill="none" stroke-linecap="round"/></svg>');

const desc = 'Flow-field wallpapers that match your desktop theme. Every image is a short recipe you can share, remix and render at any size.';
const url = 'https://kemonoo.github.io/emberfield/';
const head = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${desc}">
<meta property="og:title" content="Ember Field">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${url}og.jpg">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e0e11">
<link rel="icon" href="${favicon}">
<script>window.EMBERFIELD_SITE = true;</script>
`;
const gallery = '<script>window.EMBERFIELD_GALLERY = ' + JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'gallery.json'), 'utf8'))) + ';</script>\n';
const studio = fs.readFileSync(path.join(root, 'studio.html'), 'utf8');

fs.writeFileSync(path.join(docs, 'index.html'), head + gallery + studio + '</html>\n');
// The Claude artifact version: the same page body, with the gallery inlined but no site-only features.
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build', 'artifact.html'), studio.replace('<style>', gallery + '<style>'));
for (const f of ['emberfield.js', 'gallery.json']) fs.copyFileSync(path.join(root, f), path.join(docs, f));
fs.writeFileSync(path.join(docs, '.nojekyll'), '');
console.log('built docs/');
