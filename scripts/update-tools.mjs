#!/usr/bin/env node
/**
 * Copyright (c) 2026 Leapter GmbH. All rights reserved.
 */

import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = 'leapter/genielabs';
const TAG = 'leapter-tools-latest';

const vendorMapping = {
  'leapter-cli.cjs': [
    '.leapter-tools/cli/leapter-cli.cjs'
  ],
  'leapter-blueprint-viewer.vsix': [
    '.leapter-tools/leapter-blueprint-viewer.vsix'
  ],
  'runtime-browser.mjs': [
    'packages/runtime-browser/runtime-browser.mjs'
  ],
  'runtime-browser.d.ts': [
    'packages/runtime-browser/runtime-browser.d.ts'
  ],
  'build-info.json': [
    '.leapter-tools/build-info.json'
  ]
};

const expectedFiles = [
  'leapter-cli.cjs',
  'leapter-blueprint-viewer.vsix',
  'runtime-browser.mjs',
  'runtime-browser.d.ts',
  'build-info.json',
  'SHA256SUMS'
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

function copyFileWithDir(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function main() {
  console.log('=== Leapter Tools Update Script ===');

  // 1. Check gh availability
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (err) {
    console.error('Error: "gh" CLI is not installed or not in PATH.');
    console.error('Please install GitHub CLI and authenticate.');
    process.exit(1);
  }

  // 2. Check gh auth status
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch (err) {
    console.error('Error: "gh" CLI is not authenticated.');
    console.error('Please run "gh auth login" to authenticate with GitHub.');
    process.exit(1);
  }

  // 3. Query release info
  let publishedAt = 'Unknown';
  try {
    publishedAt = execSync(`gh release view ${TAG} --repo ${REPO} --json publishedAt --jq .publishedAt`, { encoding: 'utf8' }).trim();
    console.log(`Release Tag: ${TAG}`);
    console.log(`Release Published: ${publishedAt}`);
  } catch (err) {
    console.error(`Error: Failed to view release ${TAG} in ${REPO}.`);
    console.error(err.message);
    process.exit(1);
  }

  // 4. Create temporary directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leapter-tools-'));
  console.log(`Created temp directory for download: ${tempDir}`);

  try {
    // 5. Download assets
    console.log(`Downloading assets from ${REPO}@${TAG}...`);
    execSync(`gh release download ${TAG} --repo ${REPO} --dir "${tempDir}" --clobber`, { stdio: 'inherit' });

    // 6. Validate downloaded files existence
    for (const filename of expectedFiles) {
      const filePath = path.join(tempDir, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Expected downloaded asset '${filename}' is missing from the download.`);
      }
    }

    // 7. Parse SHA256SUMS and verify checksums
    console.log('Verifying SHA256 checksums...');
    const sha256sumsContent = fs.readFileSync(path.join(tempDir, 'SHA256SUMS'), 'utf8');
    const expectedChecksums = {};
    for (const line of sha256sumsContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;
      const hash = parts[0];
      let filename = parts[1];
      if (filename.startsWith('*')) {
        filename = filename.slice(1);
      }
      expectedChecksums[filename] = hash;
    }

    // Verify all mapping assets + build-info.json
    const filesToVerify = Object.keys(vendorMapping);
    for (const filename of filesToVerify) {
      const filePath = path.join(tempDir, filename);
      const actualHash = getSHA256(filePath);
      const expectedHash = expectedChecksums[filename];
      if (!expectedHash) {
        throw new Error(`No SHA256 checksum found for '${filename}' in SHA256SUMS.`);
      }
      if (actualHash !== expectedHash) {
        throw new Error(`SHA256 checksum mismatch for '${filename}'!\nExpected: ${expectedHash}\nActual:   ${actualHash}`);
      }
      console.log(`  ✓ Checksum verified: ${filename}`);
    }

    // 8. Load build info for reporting
    const buildInfoContent = fs.readFileSync(path.join(tempDir, 'build-info.json'), 'utf8');
    const buildInfo = JSON.parse(buildInfoContent);

    // 9. Vendor files
    console.log('Vendoring files to workspace locations...');
    const updatedFilesReport = [];
    for (const [filename, targets] of Object.entries(vendorMapping)) {
      const srcPath = path.join(tempDir, filename);
      const size = fs.statSync(srcPath).size;
      const info = buildInfo[filename] || {};
      
      for (const target of targets) {
        copyFileWithDir(srcPath, path.resolve(process.cwd(), target));
        updatedFilesReport.push({
          filename,
          target,
          size: formatBytes(size),
          commit: info.commit_short || 'unknown',
          built_at: info.built_at || 'unknown'
        });
      }
    }

    console.log('\n=== Update Report ===');
    console.log(`Release Published: ${publishedAt}`);
    console.log('------------------------------------------------------------------------------------------------------');
    console.log(`${'Asset Filename'.padEnd(32)} | ${'Target Path'.padEnd(52)} | ${'Size'.padEnd(10)} | ${'Commit'.padEnd(8)} | Built At`);
    console.log('------------------------------------------------------------------------------------------------------');
    for (const item of updatedFilesReport) {
      console.log(
        `${item.filename.padEnd(32)} | ` +
        `${item.target.padEnd(52)} | ` +
        `${item.size.padEnd(10)} | ` +
        `${item.commit.padEnd(8)} | ` +
        `${item.built_at}`
      );
    }
    console.log('------------------------------------------------------------------------------------------------------');

    // 10. Install/restore CLI dependencies
    console.log('\nInstalling/restoring Leapter CLI dependencies...');
    execSync('npm install --prefix .leapter-tools/cli', { stdio: 'inherit', cwd: process.cwd() });

    // 11. Post-update conversion
    console.log('\nRunning pnpm convert:blueprints to refresh converted JSON blueprints...');
    execSync('pnpm run convert:blueprints', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✓ Blueprints successfully refreshed with updated CLI.');

    console.log('\n🎉 Leapter tooling successfully updated to latest rolling release!');

  } finally {
    // Cleanup temp dir
    try {
      if (fs.existsSync(tempDir)) {
        console.log(`Cleaning up temporary directory ${tempDir}...`);
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error('Warning: Failed to clean up temp directory:', cleanupErr.message);
    }
  }
}

main();
