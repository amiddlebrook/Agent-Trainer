#!/usr/bin/env node

/**
 * Configuration checker for Agent Trainer
 * Validates that wrangler.toml is properly configured before deployment
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
    console.error('\x1b[31mError: wrangler.toml contains placeholder values!\x1b[0m');
    console.error('');
    console.error('The following placeholders need to be replaced:');
    foundPlaceholders.forEach(p => console.error(`  - ${p}`));
    console.error('');
    console.error('Run the setup script to configure KV namespaces:');
    console.error('  npm run setup');
    console.error('');
    console.error('Or manually create namespaces and update wrangler.toml:');
    console.error('  wrangler kv:namespace create "AGENTS_KV"');
    console.error('  wrangler kv:namespace create "TRAINING_JOBS_KV"');
    process.exit(1);
  }

  console.log('\x1b[32mConfiguration check passed!\x1b[0m');
  console.log('wrangler.toml is properly configured.');
  process.exit(0);
}

checkConfig();
