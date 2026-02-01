// Agent management handlers
export async function handleUploadAgent(request, env) {
  try {
    const { name, config } = await request.json();
    
    if (!name || !config) {
      return new Response(JSON.stringify({ error: 'Name and config are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Generate unique agent ID
    const agentId = generateId();
    
    // Store agent in KV
    const agentData = {
      id: agentId,
      name,
      config,
      createdAt: new Date().toISOString(),
    };
    
    await env.AGENTS_KV.put(`agent:${agentId}`, JSON.stringify(agentData));
    
    return new Response(JSON.stringify({ 
      success: true, 
      agentId,
      message: 'Agent uploaded successfully' 
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

export async function handleListAgents(request, env) {
  try {
    // List all agents from KV
    const list = await env.AGENTS_KV.list({ prefix: 'agent:' });
    const agents = [];
    
    for (const key of list.keys) {
      const agentData = await env.AGENTS_KV.get(key.name);
      if (agentData) {
        agents.push(JSON.parse(agentData));
      }
    }
    
    return new Response(JSON.stringify({ agents }), {
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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
