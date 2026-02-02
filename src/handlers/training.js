import { processTraining } from '../services/huggingface';

// Training job handlers
export async function handleSubmitTraining(request, env, ctx) {
  try {
    const { agentId, modality, contentType, content, params } = await request.json();
    
    if (!agentId || !modality || !content) {
      return new Response(JSON.stringify({ 
        error: 'AgentId, modality, and content are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Verify agent exists
    const agentData = await env.AGENTS_KV.get(`agent:${agentId}`);
    if (!agentData) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Generate training job ID
    const trainingId = generateId();
    
    // Create training job
    const trainingJob = {
      id: trainingId,
      agentId,
      modality,
      contentType,
      content,
      params: params || {},
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await env.TRAINING_JOBS_KV.put(`training:${trainingId}`, JSON.stringify(trainingJob));

    // Start async training process using ctx.waitUntil() to keep worker alive
    // This ensures the background job completes even after the response is sent
    ctx.waitUntil(processTrainingJob(env, trainingId, trainingJob));
    
    return new Response(JSON.stringify({ 
      success: true, 
      trainingId,
      message: 'Training job submitted' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleGetTrainingStatus(request, env) {
  try {
    const url = new URL(request.url);
    const trainingId = url.pathname.split('/').pop();
    
    const trainingData = await env.TRAINING_JOBS_KV.get(`training:${trainingId}`);
    
    if (!trainingData) {
      return new Response(JSON.stringify({ error: 'Training job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const job = JSON.parse(trainingData);
    
    return new Response(JSON.stringify({
      id: job.id,
      status: job.status,
      progress: job.progress,
      modality: job.modality,
      message: job.message || '',
      error: job.error || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Simulate training process (in production, use Durable Objects or Queues)
async function processTrainingJob(env, trainingId, job) {
  try {
    // Update status to processing
    job.status = 'processing';
    job.progress = 10;
    job.message = 'Preparing training data...';
    job.updatedAt = new Date().toISOString();
    await env.TRAINING_JOBS_KV.put(`training:${trainingId}`, JSON.stringify(job));
    
    // Get agent data
    const agentData = await env.AGENTS_KV.get(`agent:${job.agentId}`);
    const agent = JSON.parse(agentData);
    
    // Process with HuggingFace
    job.progress = 30;
    job.message = 'Processing with HuggingFace API...';
    job.updatedAt = new Date().toISOString();
    await env.TRAINING_JOBS_KV.put(`training:${trainingId}`, JSON.stringify(job));
    
    const result = await processTraining(env, job.modality, job.content, job.params);
    
    // Update job with results
    job.status = 'completed';
    job.progress = 100;
    job.message = 'Training completed successfully';
    job.result = result;
    job.trainedAgent = {
      ...agent.config,
      trainedWith: job.modality,
      trainingData: result,
      trainedAt: new Date().toISOString(),
    };
    job.updatedAt = new Date().toISOString();
    await env.TRAINING_JOBS_KV.put(`training:${trainingId}`, JSON.stringify(job));
    
  } catch (error) {
    // Update job with error
    job.status = 'failed';
    job.error = error.message;
    job.message = 'Training failed';
    job.updatedAt = new Date().toISOString();
    await env.TRAINING_JOBS_KV.put(`training:${trainingId}`, JSON.stringify(job));
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
