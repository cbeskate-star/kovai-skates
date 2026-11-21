#!/usr/bin/env node
/**
 * Page Integrity & Security Verification Script
 * - Validates HTML structure (balanced tags, unclosed style blocks)
 * - Ensures 36th-TN-Skating-Championship.html and tn-championship-2026.html remain 100% in sync
 * - Creates/maintains a clean backup snapshot
 * - Prevents corrupted or collapsed pages from being built or deployed
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const HTML_FILES = [
  'index.html',
  'about.html',
  'events.html',
  'facilities.html',
  '36th-TN-Skating-Championship.html',
  'tn-championship-2026.html',
  '404.html'
];

const BACKUP_PATH = path.join(rootDir, 'assets', 'state-championship-backup.html');
const PRIMARY_CHAMPIONSHIP = path.join(rootDir, '36th-TN-Skating-Championship.html');
const SECONDARY_CHAMPIONSHIP = path.join(rootDir, 'tn-championship-2026.html');

const restoreRequested = process.argv.includes('--restore');

function checkFileTagIntegrity(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf8');
  // Strip comments for tag count accuracy
  const content = rawContent.replace(/<!--[\s\S]*?-->/g, '');
  const errors = [];

  const requiredPairs = [
    { openPattern: /<html\b[^>]*>/gi, closePattern: /<\/html>/gi, name: 'html' },
    { openPattern: /<head\b[^>]*>/gi, closePattern: /<\/head>/gi, name: 'head' },
    { openPattern: /<body\b[^>]*>/gi, closePattern: /<\/body>/gi, name: 'body' }
  ];

  for (const pair of requiredPairs) {
    const openCount = (content.match(pair.openPattern) || []).length;
    const closeCount = (content.match(pair.closePattern) || []).length;
    if (openCount !== 1) {
      errors.push(`Expected 1 <${pair.name}> tag, found ${openCount}`);
    }
    if (closeCount !== 1) {
      errors.push(`Expected 1 </${pair.name}> tag, found ${closeCount}`);
    }
  }

  const styleOpenCount = (content.match(/<style\b[^>]*>/gi) || []).length;
  const styleCloseCount = (content.match(/<\/style>/gi) || []).length;
  if (styleOpenCount !== styleCloseCount) {
    errors.push(`Mismatched <style> tags: ${styleOpenCount} open vs ${styleCloseCount} close`);
  }

  // Validate CSS in <style> tags with lightningcss
  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(content)) !== null) {
    const cssCode = match[1];
    try {
      transform({
        filename: path.basename(filePath),
        code: Buffer.from(cssCode),
        minify: true
      });
    } catch (err) {
      errors.push(`CSS syntax error: ${err.message}`);
    }
  }

  // Check for duplicate :root declarations in championship file
  if (filePath.includes('Championship') || filePath.includes('championship')) {
    const rootMatches = (content.match(/:\s*root\s*\{/gi) || []).length;
    if (rootMatches > 1) {
      errors.push(`Found ${rootMatches} duplicate :root declarations in CSS`);
    }
  }

  return errors;
}

function run() {
  console.log('[CDSA Integrity Guard] Running page security and integrity checks...');

  // 1. If restore requested, restore championship from backup
  if (restoreRequested) {
    if (fs.existsSync(BACKUP_PATH)) {
      const backupContent = fs.readFileSync(BACKUP_PATH, 'utf8');
      fs.writeFileSync(PRIMARY_CHAMPIONSHIP, backupContent, 'utf8');
      fs.writeFileSync(SECONDARY_CHAMPIONSHIP, backupContent, 'utf8');
      console.log('✅ Successfully restored State Championship pages from verified backup.');
      return;
    } else {
      console.error('❌ No backup snapshot found to restore.');
      process.exit(1);
    }
  }

  // 2. Ensure 36th-TN-Skating-Championship.html and tn-championship-2026.html are synchronized
  if (fs.existsSync(PRIMARY_CHAMPIONSHIP)) {
    const primaryContent = fs.readFileSync(PRIMARY_CHAMPIONSHIP, 'utf8');
    const secondaryContent = fs.existsSync(SECONDARY_CHAMPIONSHIP) ? fs.readFileSync(SECONDARY_CHAMPIONSHIP, 'utf8') : '';

    if (primaryContent !== secondaryContent) {
      console.log('🔄 Auto-syncing tn-championship-2026.html with 36th-TN-Skating-Championship.html...');
      fs.writeFileSync(SECONDARY_CHAMPIONSHIP, primaryContent, 'utf8');
    }
  }

  // 3. Validate all HTML files
  let hasErrors = false;
  for (const file of HTML_FILES) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[CDSA Integrity Guard] Skipping missing file: ${file}`);
      continue;
    }

    const errors = checkFileTagIntegrity(fullPath);
    if (errors.length > 0) {
      console.error(`❌ Integrity check failed for ${file}:`);
      errors.forEach(e => console.error(`   - ${e}`));
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n🚨 Page integrity verification failed! Build blocked to prevent page collapse.');
    console.error('💡 Run `node scripts/verify-pages.js --restore` if you need to restore the championship page.\n');
    process.exit(1);
  }

  // 4. Update verified backup snapshot on successful validation
  if (fs.existsSync(PRIMARY_CHAMPIONSHIP)) {
    const primaryContent = fs.readFileSync(PRIMARY_CHAMPIONSHIP, 'utf8');
    fs.writeFileSync(BACKUP_PATH, primaryContent, 'utf8');
  }

  console.log('✅ All page integrity & security checks passed successfully.');
}

run();
