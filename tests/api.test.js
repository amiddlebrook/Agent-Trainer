import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

function namespace() {
  const store = new Map();
  return {
    async get(key) { return store.get(key) ?? null; },
    async put(key, value) { store.set(key, value); },
    async delete(key) { store.delete(key); },
    async list({ prefix = '' } = {}) {
      return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true };
    }
  };
}
function environment() {
  return {
    ADMIN_TOKEN: 'unit-test-secret-key-123',
    AGENTS_KV: namespace(),
    TRAINING_JOBS_KV: namespace(),
    AI: {
      async run(model, options) {
        assert.equal(model, '@cf/meta/llama-3.1-8b-instruct-fp8');
        assert.ok(options.messages.length >= 2);
        return { response: options.max_tokens === 850 ? 'You are a precise assistant. Answer directly.' : 'A tested model response.' };
      }
    }
  };
}
const origin = 'https://agent-trainer.test';
function request(method, path, body, authorized = true) {
  return new Request(origin + path, {
    method,
    headers: {
      ...(authorized ? { authorization: 'Bearer unit-test-secret-key-123' } : {}),
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}
async function run(env, method, path, body, authorized = true) {
  const response = await worker.fetch(request(method, path, body, authorized), env);
  return { status: response.status, headers: response.headers, data: await response.json() };
}
test('HTML and unauthenticated health are available', async () => {
  const env = environment();
  const ui = await worker.fetch(request('GET', '/', undefined, false), env);
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /Design agents that/);
  const health = await run(env, 'GET', '/api/health', undefined, false);
  assert.equal(health.data.ok, true);
  assert.equal(health.data.authConfigured, true);
});
test('workspace key protects stored data and AI calls', async () => {
  const env = environment();
  assert.equal((await run(env, 'GET', '/api/agents', undefined, false)).status, 401);
  env.ADMIN_TOKEN = '';
  assert.equal((await run(env, 'GET', '/api/agents')).status, 503);
});
test('create, teach, optimize, test, export and remove an agent', async () => {
  const env = environment();
  const created = await run(env, 'POST', '/api/agents', { name: 'Analyst', instructions: 'Be helpful.' });
  assert.equal(created.status, 201);
  const id = created.data.agentId;
  assert.equal((await run(env, 'GET', '/api/agents')).data.agents.length, 1);
  assert.equal((await run(env, 'POST', '/api/train', { agentId: id })).status, 400);
  const taught = await run(env, 'POST', '/api/agents/' + id + '/examples', { input: 'What is 2 + 2?', expected: '4.' });
  assert.equal(taught.status, 201);
  assert.equal(taught.data.agent.examples.length, 1);
  const trained = await run(env, 'POST', '/api/train', { agentId: id, mode: 'optimize' });
  assert.equal(trained.status, 200);
  assert.equal(trained.data.version, 2);
  assert.match(trained.data.agent.instructions, /precise assistant/);
  assert.equal(trained.data.agent.versions.length, 2);
  const live = await run(env, 'POST', '/api/chat', { agentId: id, message: 'Test' });
  assert.equal(live.data.response, 'A tested model response.');
  const job = await run(env, 'GET', '/api/train/' + trained.data.trainingId);
  assert.equal(job.data.status, 'completed');
  const file = await run(env, 'GET', '/api/download/' + trained.data.trainingId);
  assert.equal(file.data.schema, 'agent-trainer/v2');
  assert.match(file.headers.get('content-disposition'), /attachment/);
  const exported = await run(env, 'GET', '/api/agents/' + id + '/export');
  assert.equal(exported.data.versions.length, 2);
  assert.equal((await run(env, 'DELETE', '/api/agents/' + id)).data.success, true);
  assert.equal((await run(env, 'GET', '/api/agents')).data.agents.length, 0);
});
test('manual version, removing example and compile-only mode', async () => {
  const env = environment();
  const id = (await run(env, 'POST', '/api/agents', { name: 'Guide', instructions: 'Explain simply.' })).data.agentId;
  const changed = await run(env, 'PUT', '/api/agents/' + id, { name: 'Updated', instructions: 'Explain clearly.' });
  assert.equal(changed.data.agent.activeVersion, 2);
  const sample = (await run(env, 'POST', '/api/agents/' + id + '/examples', { input: 'Hi', expected: 'Hello' })).data.agent.examples[0];
  const compiled = await run(env, 'POST', '/api/train', { agentId: id, mode: 'compile' });
  assert.equal(compiled.data.version, 3);
  assert.equal(compiled.data.agent.instructions, 'Explain clearly.');
  assert.equal((await run(env, 'DELETE', '/api/agents/' + id + '/examples/' + sample.id)).status, 200);
});
test('inference failures do not manufacture successful training results', async () => {
  const env = environment();
  const id = (await run(env, 'POST', '/api/agents', { name: 'Safe', instructions: 'Be safe.' })).data.agentId;
  await run(env, 'POST', '/api/agents/' + id + '/examples', { input: 'Q', expected: 'A' });
  env.AI.run = async () => { throw new Error('Workers AI quota exceeded'); };
  const result = await run(env, 'POST', '/api/train', { agentId: id });
  assert.equal(result.status, 502);
  assert.equal((await run(env, 'GET', '/api/agents/' + id)).data.agent.activeVersion, 1);
});
