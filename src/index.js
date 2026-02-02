import { handleHome } from './handlers/home.js';
import { handleUploadAgent, handleListAgents } from './handlers/agents.js';
import { handleSubmitTraining, handleGetTrainingStatus } from './handlers/training.js';
import { handleDownloadAgent } from './handlers/download.js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // Routes
      if (path === '/' && method === 'GET') {
        return handleHome();
      }

      if (path === '/api/agents' && method === 'POST') {
        return handleUploadAgent(request, env);
      }

      if (path === '/api/agents' && method === 'GET') {
        return handleListAgents(request, env);
      }

      if (path === '/api/train' && method === 'POST') {
        return handleSubmitTraining(request, env, ctx);
      }

      if (path.startsWith('/api/train/') && method === 'GET') {
        return handleGetTrainingStatus(request, env);
      }

      if (path.startsWith('/api/download/') && method === 'GET') {
        return handleDownloadAgent(request, env);
      }

      // 404 handler
      return new Response('Not Found', { status: 404 });
    } catch (err) {
      console.error('Error:', err);
      return new Response('Internal Server Error: ' + err.message, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  },
};
