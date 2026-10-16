import { writeFile } from 'node:fs/promises';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!accountId || !token) {
  console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN. These are required for deployment.');
  process.exit(1);
}
if (!/^[a-fA-F0-9]{32}$/.test(accountId)) {
  console.error('CLOUDFLARE_ACCOUNT_ID must be a 32-character Cloudflare account ID.');
  process.exit(1);
}
const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/storage/kv/namespaces';
async function api(path, options = {}) {
  const response = await fetch(endpoint + path, {
    ...options,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error('Cloudflare KV API failed: ' + (data.errors || []).map(e => e.message).join('; ') + ' (' + response.status + ')');
  }
  return data;
}
const existing = [];
for (let page = 1; page <= 10; page++) {
  const data = await api('?per_page=100&page=' + page);
  existing.push(...(data.result || []));
  if (!data.result_info || page >= data.result_info.total_pages) break;
}
async function getOrCreate(title) {
  const found = existing.find(n => n.title === title);
  if (found) {
    console.log('Reusing KV namespace:', title);
    return found.id;
  }
  const created = await api('', { method: 'POST', body: JSON.stringify({ title }) });
  console.log('Created KV namespace:', title);
  return created.result.id;
}
const agents = await getOrCreate('agent-trainer-agents');
const jobs = await getOrCreate('agent-trainer-jobs');
const config = [
  'name = "agent-trainer"',
  'main = "src/index.js"',
  'compatibility_date = "2026-09-01"',
  'workers_dev = true',
  '[ai]',
  'binding = "AI"',
  '[[kv_namespaces]]',
  'binding = "AGENTS_KV"',
  'id = "' + agents + '"',
  '[[kv_namespaces]]',
  'binding = "TRAINING_JOBS_KV"',
  'id = "' + jobs + '"'
].join('\n') + '\n';
await writeFile('wrangler.ci.toml', config);
console.log('Generated account-specific wrangler.ci.toml (KV IDs are not committed).');
