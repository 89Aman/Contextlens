#!/usr/bin/env node
/**
 * CI check: fail if two packages in the monorepo declare the same `bin` name.
 * Prevents global-install collisions (e.g. `contextlens` vs `contextlens-mcp`).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const seen = new Map(); // binName -> package.json path
const problems = [];

function walk(dir) {
  if (dir.includes('node_modules') || dir.includes('.git')) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name === 'package.json') {
      checkPackage(full);
    }
  }
}

function checkPackage(pkgPath) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return; // malformed or unreadable — ignore
  }
  const bins = pkg.bin;
  if (!bins) return;
  const entries = typeof bins === 'string' ? [[pkg.name, bins]] : Object.entries(bins);
  for (const [binName, target] of entries) {
    if (seen.has(binName)) {
      problems.push(
        `Duplicate bin '${binName}': ${seen.get(binName)} and ${path.relative(root, pkgPath)}`
      );
    } else {
      seen.set(binName, path.relative(root, pkgPath));
      if (!fs.existsSync(path.join(path.dirname(pkgPath), target))) {
        problems.push(
          `bin '${binName}' in ${path.relative(root, pkgPath)} points to missing file '${target}'`
        );
      }
    }
  }
}

walk(root);

if (problems.length > 0) {
  console.error('Bin-conflict check FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`Bin-conflict check OK (${seen.size} unique bin name(s)).`);
