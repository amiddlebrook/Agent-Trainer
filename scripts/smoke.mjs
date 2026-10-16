const origin = process.argv[2];
if (!origin || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(origin)) {
  throw new Error('Pass a valid HTTPS workers.dev origin');
}
async function get(path) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (res.ok) return res;
      lastError = new Error(path + ' returned HTTP ' + res.status);
    } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw lastError;
}
const ui = await get('/');
const html = await ui.text();
if (!html.includes('Design agents that')) throw new Error('Unexpected application HTML; deployment may be stale.');
console.log('PASS public UI: ' + origin);
const health = await get('/api/health');
const data = await health.json();
if (!data.ok || data.platform !== 'Cloudflare Workers' || data.runtime !== 'Workers AI') {
  throw new Error('Unexpected /api/health payload: ' + JSON.stringify(data));
}
console.log('PASS Workers AI health: ' + data.model);
if (!data.authConfigured) {
  console.error('DEPLOYED BUT LOCKED: ADMIN_TOKEN has not been configured on the Worker. Add ADMIN_TOKEN as a GitHub Actions secret and rerun to synchronize it automatically, or use Wrangler: secret put ADMIN_TOKEN');
  process.exitCode = 1;
} else {
  console.log('PASS workspace access secret is configured.');
}
