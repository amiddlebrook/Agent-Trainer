import { writeFile } from 'node:fs/promises';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!accountId || !token) {
  console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.');
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
    const message = (data.errors || []).map(e => e.message).filter(Boolean).join('; ') || 'Unknown API failure';
    const verb = options.method || 'GET';
    const error = new Error('Cloudflare KV ' + verb + ' failed (' + response.status + '): ' + message);
    error.status = response.status;
    throw error;
  }
  return data;
}
const existing = [];
for (let page = 1; page <= 10; page++) {
  const data = await api('?per_page=100&page=' + page);
  existing.push(...(data.result || []));
  if (!data.result_info || page >= data.result_info.total_pages) break;
}
console.log('Discovered ' + existing.length + ' existing Cloudflare KV namespaces in the configured account.');

const preferences = {
  agents: {
    title: 'agent-trainer-agents',
    legacyId: 'f9353d8e2ebf4efea35c53eb03bf9d88',
    labels: ['agent-trainer-agents', 'AGENTS_KV', 'agent-trainer_AGENTS_KV', 'agent-trainer-AGENTS_KV', 'AGENTS_KV_PRODUCTION']
  },
  jobs: {
    title: 'agent-trainer-jobs',
    legacyId: 'deb83cb64ed24bff876032a6c3fec025',
    labels: ['agent-trainer-jobs', 'TRAINING_JOBS_KV', 'agent-trainer_TRAINING_JOBS_KV', 'agent-trainer-TRAINING_JOBS_KV', 'TRAINING_JOBS_KV_PRODUCTION']
  }
};

async function findOrCreate(which) {
  const {title, legacyId, labels} = preferences[which];
  const byId = existing.find(item => item.id === legacyId);
  if (byId) {
    console.log('Using original ' + which + ' namespace (preserves existing user data).');
    return byId.id;
  }
  const byName = existing.find(item => labels.some(label => label.toLowerCase() === item.title.toLowerCase()));
  if (byName) {
    console.log('Reusing existing ' + which + ' namespace (' + byName.title + ').');
    return byName.id;
  }
  try {
    const created = await api('', { method: 'POST', body: JSON.stringify({ title }) });
    console.log('Created ' + which + ' namespace.');
    return created.result.id;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      throw new Error('No suitable ' + which + ' KV namespace exists, and CLOUDFLARE_API_TOKEN cannot create one (HTTP ' + error.status + '). Give the token account-level Workers KV Storage: Edit permission and rerun. Existing namespaces inspected: ' + existing.length + '.');
    }
    throw error;
  }
}
const agents = await findOrCreate('agents');
const jobs = await findOrCreate('jobs');
if (agents === jobs) throw new Error('Agent and job KV namespaces must be different.');
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
console.log('Generated wrangler.ci.toml with two account-owned KV namespaces.');
