#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const type = process.argv[2] || 'patch';
const rootDir = path.resolve(__dirname, '..');
const extPkgPath = path.join(rootDir, 'vscode-extension', 'package.json');
const rootPkgPath = path.join(rootDir, 'package.json');
const contextPath = path.join(rootDir, 'CONTEXT.md');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

const extPkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf8'));
const currentVersion = extPkg.version;
const parts = currentVersion.split('.').map(Number);
const major = parts[0] || 0;
const minor = parts[1] || 0;
const patch = parts[2] || 0;

let newVersion;
if (type === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (type === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (type === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else {
  // Exact version passed
  newVersion = type.replace(/^v/, '');
}

console.log(`Bumping version: ${currentVersion} -> ${newVersion} (${type})`);

// 1. Update vscode-extension/package.json
extPkg.version = newVersion;
fs.writeFileSync(extPkgPath, JSON.stringify(extPkg, null, 2) + '\n', 'utf8');

// 2. Update root package.json
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
rootPkg.version = newVersion;
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n', 'utf8');

// 3. Update CONTEXT.md
if (fs.existsSync(contextPath)) {
  let context = fs.readFileSync(contextPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  context = context.replace(
    /\*Last Updated: .* \| Version: .*\*/,
    `*Last Updated: ${today} | Version: ${newVersion}*`
  );
  fs.writeFileSync(contextPath, context, 'utf8');
}

// 4. Update CHANGELOG.md
if (fs.existsSync(changelogPath)) {
  let changelog = fs.readFileSync(changelogPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  if (!changelog.includes(`## [${newVersion}]`)) {
    changelog = changelog.replace(
      '## [Unreleased]',
      `## [Unreleased]\n\n## [${newVersion}] - ${today}`
    );
    fs.writeFileSync(changelogPath, changelog, 'utf8');
  }
}

// 5. Update lockfiles cleanly
try {
  execSync('npm i --package-lock-only', { cwd: rootDir, stdio: 'ignore' });
  execSync('npm --prefix vscode-extension i --package-lock-only', { cwd: rootDir, stdio: 'ignore' });
} catch {
  // Ignore minor lockfile sync errors if offline
}

console.log(`Successfully updated all files to version ${newVersion}`);
