// Download trained agent handler
export async function handleDownloadAgent(request, env) {
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
    
    if (job.status !== 'completed') {
      return new Response(JSON.stringify({ 
        error: 'Training not completed yet',
        status: job.status 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Return trained agent as downloadable JSON
    const trainedAgent = {
      id: trainingId,
      originalAgentId: job.agentId,
      modality: job.modality,
      trainedAgent: job.trainedAgent,
      trainingParams: job.params,
      metadata: {
        createdAt: job.createdAt,
        completedAt: job.updatedAt,
      }
    };
    
    return new Response(JSON.stringify(trainedAgent, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="trained-agent-${trainingId}.json"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
