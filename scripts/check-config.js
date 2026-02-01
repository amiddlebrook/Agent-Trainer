#!/usr/bin/env node

/**
 * Configuration checker for Agent Trainer
 *
 * This script:
 * 1. Injects KV namespace configuration from environment variables
 * 2. Validates wrangler.toml is properly configured before deployment
 */

const fs = require('fs');
const path = require('path');

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

function injectKvConfig(wranglerPath) {
  const agentsKvId = process.env.AGENTS_KV_ID;
  const trainingJobsKvId = process.env.TRAINING_JOBS_KV_ID;

  if (!agentsKvId || !trainingJobsKvId) {
    return false;
  }

  const agentsKvPreviewId = process.env.AGENTS_KV_PREVIEW_ID || agentsKvId;
  const trainingJobsKvPreviewId = process.env.TRAINING_JOBS_KV_PREVIEW_ID || trainingJobsKvId;

  let content = fs.readFileSync(wranglerPath, 'utf-8');

  // Check if KV namespaces are already configured (not placeholders)
  const hasAgentsKv = content.includes('binding = "AGENTS_KV"') && !PLACEHOLDER_PATTERNS.some(p => content.includes(p));

  if (hasAgentsKv) {
    console.log('KV namespaces already configured in wrangler.toml');
    return true;
  }

  // Remove any existing [[kv_namespaces]] blocks with placeholders
  content = content.replace(/\[\[kv_namespaces\]\][^\[]*binding = "AGENTS_KV"[^\[]*/g, '');
  content = content.replace(/\[\[kv_namespaces\]\][^\[]*binding = "TRAINING_JOBS_KV"[^\[]*/g, '');

  // Find where to insert KV config (before [vars] or at end of file)
  const kvConfig = `
[[kv_namespaces]]
binding = "AGENTS_KV"
id = "${agentsKvId}"
preview_id = "${agentsKvPreviewId}"

[[kv_namespaces]]
binding = "TRAINING_JOBS_KV"
id = "${trainingJobsKvId}"
preview_id = "${trainingJobsKvPreviewId}"

`;

  // Insert before [vars] section
  if (content.includes('[vars]')) {
    content = content.replace('[vars]', kvConfig + '[vars]');
  } else {
    content = content + '\n' + kvConfig;
  }

  fs.writeFileSync(wranglerPath, content);

  console.log('\x1b[32mKV namespaces configured from environment variables:\x1b[0m');
  console.log(`  AGENTS_KV: ${agentsKvId}`);
  console.log(`  TRAINING_JOBS_KV: ${trainingJobsKvId}`);
  console.log('');

  return true;
}

function checkConfig() {
  const wranglerPath = path.join(__dirname, '..', 'wrangler.toml');

  if (!fs.existsSync(wranglerPath)) {
    console.error('\x1b[31mError: wrangler.toml not found!\x1b[0m');
    process.exit(1);
  }

  // Always try to inject KV config from environment variables
  if (hasRequiredEnvVars()) {
    injectKvConfig(wranglerPath);
  }

  // Read the (potentially modified) wrangler.toml
  const content = fs.readFileSync(wranglerPath, 'utf-8');

  // Check for placeholders
  const foundPlaceholders = PLACEHOLDER_PATTERNS.filter(p => content.includes(p));
  if (foundPlaceholders.length > 0) {
    console.error('\x1b[31mError: wrangler.toml contains placeholder values!\x1b[0m');
    console.error('Placeholders found:', foundPlaceholders.join(', '));
    showSetupInstructions();
    process.exit(1);
  }

  // Check if KV namespaces are configured
  const hasKvConfig = content.includes('binding = "AGENTS_KV"') && content.includes('binding = "TRAINING_JOBS_KV"');

  if (!hasKvConfig) {
    console.error('\x1b[31mError: KV namespaces not configured!\x1b[0m');
    console.error('');
    showSetupInstructions();
    process.exit(1);
  }

  console.log('\x1b[32mConfiguration check passed!\x1b[0m');
  process.exit(0);
}

function showSetupInstructions() {
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
    console.error('\x1b[36mSTEP 2: Add Environment Variables\x1b[0m');
    console.error('  In Cloudflare Pages (Settings → Environment Variables):');
    console.error('     • AGENTS_KV_ID = <your AGENTS namespace ID>');
    console.error('     • TRAINING_JOBS_KV_ID = <your TRAINING_JOBS namespace ID>');
    console.error('');
    console.error('\x1b[36mSTEP 3: Change Deploy Command\x1b[0m');
    console.error('  In Cloudflare Pages (Settings → Builds & deployments):');
    console.error('  Change deploy command from "npx wrangler deploy" to:');
    console.error('     \x1b[32mnpm run deploy\x1b[0m');
    console.error('');
  } else {
    console.error('Run the setup script to configure KV namespaces:');
    console.error('  npm run setup');
    console.error('');
    console.error('Or manually create namespaces and set environment variables:');
    console.error('  wrangler kv:namespace create "AGENTS_KV"');
    console.error('  wrangler kv:namespace create "TRAINING_JOBS_KV"');
    console.error('  export AGENTS_KV_ID=<id from above>');
    console.error('  export TRAINING_JOBS_KV_ID=<id from above>');
  }
}

checkConfig();
