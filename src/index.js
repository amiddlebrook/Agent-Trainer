import { Router } from 'itty-router';
import { handleHome } from './handlers/home';
import { handleUploadAgent, handleListAgents } from './handlers/agents';
import { handleSubmitTraining, handleGetTrainingStatus } from './handlers/training';
import { handleDownloadAgent } from './handlers/download';

const router = Router();

// Routes
router.get('/', handleHome);
router.post('/api/agents', handleUploadAgent);
router.get('/api/agents', handleListAgents);
router.post('/api/train', handleSubmitTraining);
router.get('/api/train/:id', handleGetTrainingStatus);
router.get('/api/download/:id', handleDownloadAgent);

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
};
