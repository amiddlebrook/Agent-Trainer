#!/usr/bin/env node

/**
 * Configuration checker for Agent Trainer
 * Validates that wrangler.toml is properly configured before deployment
 *
 * In CI environments with required env vars, automatically runs configuration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLACEHOLDER_PATTERNS = [
  'your_kv_namespace_id',
  'your_preview_kv_namespace_id',
  'your_training_jobs_kv_namespace_id',
  'your_preview_training_jobs_kv_namespace_id',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
];

function isCI() {
  return !!(
    process.env.CI ||
    process.env.CF_PAGES ||
    process.env.CLOUDFLARE_PAGES ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS
  );
}

function hasRequiredEnvVars() {
  return !!(process.env.AGENTS_KV_ID && process.env.TRAINING_JOBS_KV_ID);
}

function runConfigureScript() {
  console.log('\x1b[33mCI environment detected with KV namespace environment variables.\x1b[0m');
  console.log('Auto-configuring wrangler.toml...');
  console.log('');

  try {
    const configureScript = path.join(__dirname, 'configure-wrangler.js');
    execSync(`node "${configureScript}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('\x1b[31mFailed to auto-configure wrangler.toml\x1b[0m');
    return false;
  }
}

function checkConfig() {
  const wranglerPath = path.join(__dirname, '..', 'wrangler.toml');

  if (!fs.existsSync(wranglerPath)) {
    console.error('\x1b[31mError: wrangler.toml not found!\x1b[0m');
    console.error('');
    console.error('Please copy wrangler.toml.example to wrangler.toml and configure it:');
    console.error('  cp wrangler.toml.example wrangler.toml');
    console.error('  npm run setup');
    process.exit(1);
  }

  const content = fs.readFileSync(wranglerPath, 'utf-8');
  const foundPlaceholders = PLACEHOLDER_PATTERNS.filter(p => content.includes(p));

  if (foundPlaceholders.length > 0) {
    // In CI with env vars, auto-configure
    if (isCI() && hasRequiredEnvVars()) {
      if (runConfigureScript()) {
        // Re-check after configuration
        const newContent = fs.readFileSync(wranglerPath, 'utf-8');
        const remainingPlaceholders = PLACEHOLDER_PATTERNS.filter(p => newContent.includes(p));
        if (remainingPlaceholders.length === 0) {
          console.log('');
          console.log('\x1b[32mConfiguration check passed after auto-configuration!\x1b[0m');
          process.exit(0);
        }
      }
    }

    console.error('\x1b[31mError: wrangler.toml contains placeholder values!\x1b[0m');
    console.error('');
    console.error('The following placeholders need to be replaced:');
    foundPlaceholders.forEach(p => console.error(`  - ${p}`));
    console.error('');

    if (isCI()) {
      console.error('\x1b[33mCI Environment Detected\x1b[0m');
      console.error('');
      console.error('Set these environment variables in your CI/CD settings:');
      console.error('  - AGENTS_KV_ID: Your AGENTS_KV namespace ID');
      console.error('  - TRAINING_JOBS_KV_ID: Your TRAINING_JOBS_KV namespace ID');
      console.error('');
      console.error('For Cloudflare Pages:');
      console.error('  1. Go to your Pages project settings');
      console.error('  2. Navigate to Environment Variables');
      console.error('  3. Add AGENTS_KV_ID and TRAINING_JOBS_KV_ID with your namespace IDs');
      console.error('');
      console.error('To get namespace IDs, run locally:');
      console.error('  wrangler kv:namespace create "AGENTS_KV"');
      console.error('  wrangler kv:namespace create "TRAINING_JOBS_KV"');
    } else {
      console.error('Run the setup script to configure KV namespaces:');
      console.error('  npm run setup');
      console.error('');
      console.error('Or manually create namespaces and update wrangler.toml:');
      console.error('  wrangler kv:namespace create "AGENTS_KV"');
      console.error('  wrangler kv:namespace create "TRAINING_JOBS_KV"');
    }
    process.exit(1);
  }

  console.log('\x1b[32mConfiguration check passed!\x1b[0m');
  console.log('wrangler.toml is properly configured.');
  process.exit(0);
}

checkConfig();
