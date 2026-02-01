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
      console.error('\x1b[33m╔══════════════════════════════════════════════════════════════════╗\x1b[0m');
      console.error('\x1b[33m║  CI ENVIRONMENT DETECTED - KV NAMESPACES NOT CONFIGURED         ║\x1b[0m');
      console.error('\x1b[33m╚══════════════════════════════════════════════════════════════════╝\x1b[0m');
      console.error('');
      console.error('\x1b[36mSTEP 1: Create KV Namespaces in Cloudflare Dashboard\x1b[0m');
      console.error('  1. Go to: https://dash.cloudflare.com → Workers & Pages → KV');
      console.error('  2. Click "Create a namespace"');
      console.error('  3. Create: "agent-trainer-agents" (copy the ID)');
      console.error('  4. Create: "agent-trainer-training-jobs" (copy the ID)');
      console.error('');
      console.error('\x1b[36mSTEP 2: Add Environment Variables to Cloudflare Pages\x1b[0m');
      console.error('  1. Go to: Workers & Pages → Your Project → Settings');
      console.error('  2. Click "Environment Variables"');
      console.error('  3. Add for Production AND Preview:');
      console.error('     • AGENTS_KV_ID = <paste AGENTS namespace ID>');
      console.error('     • TRAINING_JOBS_KV_ID = <paste TRAINING_JOBS namespace ID>');
      console.error('');
      console.error('\x1b[36mSTEP 3: Update Deploy Command\x1b[0m');
      console.error('  1. Go to: Workers & Pages → Your Project → Settings → Build');
      console.error('  2. Change "Deploy command" from "npx wrangler deploy" to:');
      console.error('     \x1b[32mnpm run deploy\x1b[0m');
      console.error('');
      console.error('\x1b[33mThen retry the deployment.\x1b[0m');
      console.error('');
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
