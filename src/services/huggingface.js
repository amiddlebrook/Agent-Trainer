// AI processing service using Cloudflare AI (primary) and HuggingFace API (fallback)

// Cloudflare AI model mappings
const CLOUDFLARE_MODELS = {
  'text-to-text': '@cf/meta/llama-3.1-8b-instruct',
  'audio-to-text': '@cf/openai/whisper',
  'image-to-text': '@cf/llava-hf/llava-1.5-7b-hf',
  'text-to-image': '@cf/stabilityai/stable-diffusion-xl-base-1.0',
};

// HuggingFace model mappings (fallback)
const HUGGINGFACE_MODELS = {
  'video-to-text': 'microsoft/xclip-base-patch32',
  'text-to-text': 'gpt2',
  'audio-to-text': 'openai/whisper-base',
  'image-to-text': 'nlpconnect/vit-gpt2-image-captioning',
  'text-to-image': 'stabilityai/stable-diffusion-2-1',
  'any-to-any': 'facebook/seamless-m4t-large',
};

export async function processTraining(env, modality, content, params) {
  // Try Cloudflare AI first, then fall back to HuggingFace
  const useCloudflareAI = env.AI && CLOUDFLARE_MODELS[modality];

  if (useCloudflareAI) {
    try {
      return await processWithCloudflareAI(env, modality, content, params);
    } catch (error) {
      console.error('Cloudflare AI error, falling back to HuggingFace:', error.message);
      // Fall through to HuggingFace
    }
  }

  // Fall back to HuggingFace API
  return await processWithHuggingFace(env, modality, content, params);
}

// ============================================================================
// CLOUDFLARE AI PROCESSING
// ============================================================================

async function processWithCloudflareAI(env, modality, content, params) {
  const model = CLOUDFLARE_MODELS[modality];

  switch (modality) {
    case 'text-to-text':
      return await cfTextToText(env, content, model, params);
    case 'audio-to-text':
      return await cfAudioToText(env, content, model, params);
    case 'image-to-text':
      return await cfImageToText(env, content, model, params);
    case 'text-to-image':
      return await cfTextToImage(env, content, model, params);
    default:
      throw new Error(`Cloudflare AI does not support modality: ${modality}`);
  }
}

async function cfTextToText(env, content, model, params) {
  const messages = [
    { role: 'system', content: 'You are a helpful AI assistant.' },
    { role: 'user', content: content }
  ];

  const response = await env.AI.run(model, {
    messages,
    max_tokens: params.max_length || 256,
    temperature: params.temperature || 0.7,
  });

  return {
    modality: 'text-to-text',
    model,
    provider: 'cloudflare-ai',
    input: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    output: response.response,
    timestamp: new Date().toISOString(),
  };
}

async function cfAudioToText(env, content, model, params) {
  // Content should be a URL to an audio file or base64 encoded audio
  let audioData;

  if (content.startsWith('http://') || content.startsWith('https://')) {
    // Fetch audio from URL
    const response = await fetch(content);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio from URL: ${response.status}`);
    }
    audioData = await response.arrayBuffer();
  } else if (content.startsWith('data:')) {
    // Base64 encoded audio
    const base64Data = content.split(',')[1];
    audioData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
  } else {
    throw new Error('Audio content must be a URL or base64 encoded data');
  }

  const response = await env.AI.run(model, {
    audio: [...new Uint8Array(audioData)],
  });

  return {
    modality: 'audio-to-text',
    model,
    provider: 'cloudflare-ai',
    source: content.substring(0, 100),
    transcription: response.text,
    timestamp: new Date().toISOString(),
  };
}

async function cfImageToText(env, content, model, params) {
  // Content should be a URL to an image or base64 encoded image
  let imageData;

  if (content.startsWith('http://') || content.startsWith('https://')) {
    // Fetch image from URL
    const response = await fetch(content);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status}`);
    }
    imageData = [...new Uint8Array(await response.arrayBuffer())];
  } else if (content.startsWith('data:')) {
    // Base64 encoded image
    const base64Data = content.split(',')[1];
    imageData = [...Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))];
  } else {
    throw new Error('Image content must be a URL or base64 encoded data');
  }

  const prompt = params.prompt || 'Describe this image in detail.';

  const response = await env.AI.run(model, {
    image: imageData,
    prompt: prompt,
    max_tokens: params.max_length || 256,
  });

  return {
    modality: 'image-to-text',
    model,
    provider: 'cloudflare-ai',
    source: content.substring(0, 100),
    caption: response.description || response.response,
    timestamp: new Date().toISOString(),
  };
}

async function cfTextToImage(env, content, model, params) {
  const response = await env.AI.run(model, {
    prompt: content,
    num_steps: params.num_steps || 20,
  });

  // Convert the image to base64
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(response)));

  return {
    modality: 'text-to-image',
    model,
    provider: 'cloudflare-ai',
    prompt: content,
    image: `data:image/png;base64,${base64Image}`,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// HUGGINGFACE API PROCESSING
// ============================================================================

async function processWithHuggingFace(env, modality, content, params) {
  const apiKey = env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error('HuggingFace API key not configured. Set HUGGINGFACE_API_KEY secret.');
  }

  const model = params.model || HUGGINGFACE_MODELS[modality];

  if (!model) {
    throw new Error(`Unknown modality: ${modality}`);
  }

  switch (modality) {
    case 'video-to-text':
      return await hfVideoToText(env, content, model, params);
    case 'text-to-text':
      return await hfTextToText(env, content, model, params);
    case 'audio-to-text':
      return await hfAudioToText(env, content, model, params);
    case 'image-to-text':
      return await hfImageToText(env, content, model, params);
    case 'text-to-image':
      return await hfTextToImage(env, content, model, params);
    case 'any-to-any':
      return await hfAnyToAny(env, content, model, params);
    default:
      throw new Error(`Unsupported modality: ${modality}`);
  }
}

async function hfApiCall(env, model, payload, isBlob = false) {
  const apiUrl = `${env.HUGGINGFACE_API_URL}/${model}`;

  const headers = {
    'Authorization': `Bearer ${env.HUGGINGFACE_API_KEY}`,
  };

  let body;
  if (isBlob) {
    body = payload;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(payload);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
  }

  // Check if response is an image (binary)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('image')) {
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return { image: `data:${contentType};base64,${base64}` };
  }

  return await response.json();
}

async function hfVideoToText(env, content, model, params) {
  // For video processing, we need to extract frames first
  // HuggingFace's xclip model expects video frames

  // Fetch video metadata if it's a URL
  let videoInfo = { url: content };

  // Extract YouTube ID if applicable
  const youtubeId = extractYouTubeId(content);
  if (youtubeId) {
    videoInfo.youtubeId = youtubeId;
    videoInfo.type = 'youtube';
  }

  // Make API call for video understanding
  const result = await hfApiCall(env, model, {
    inputs: content,
    parameters: {
      ...params,
    }
  });

  return {
    modality: 'video-to-text',
    model,
    provider: 'huggingface',
    source: content,
    videoInfo,
    result: Array.isArray(result) ? result : [result],
    timestamp: new Date().toISOString(),
  };
}

async function hfTextToText(env, content, model, params) {
  const result = await hfApiCall(env, model, {
    inputs: content,
    parameters: {
      max_length: params.max_length || 100,
      temperature: params.temperature || 0.7,
      return_full_text: false,
      ...params,
    }
  });

  return {
    modality: 'text-to-text',
    model,
    provider: 'huggingface',
    input: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    output: Array.isArray(result) ? result[0]?.generated_text : result.generated_text,
    fullResult: result,
    timestamp: new Date().toISOString(),
  };
}

async function hfAudioToText(env, content, model, params) {
  let audioData;

  if (content.startsWith('http://') || content.startsWith('https://')) {
    // Fetch audio from URL
    const response = await fetch(content);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio from URL: ${response.status}`);
    }
    audioData = await response.arrayBuffer();
  } else if (content.startsWith('data:')) {
    // Base64 encoded audio
    const base64Data = content.split(',')[1];
    audioData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
  } else {
    throw new Error('Audio content must be a URL or base64 encoded data');
  }

  // Send raw audio data to Whisper API
  const result = await hfApiCall(env, model, audioData, true);

  return {
    modality: 'audio-to-text',
    model,
    provider: 'huggingface',
    source: content.substring(0, 100),
    transcription: result.text,
    timestamp: new Date().toISOString(),
  };
}

async function hfImageToText(env, content, model, params) {
  let imageData;

  if (content.startsWith('http://') || content.startsWith('https://')) {
    // Fetch image from URL
    const response = await fetch(content);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status}`);
    }
    imageData = await response.arrayBuffer();
  } else if (content.startsWith('data:')) {
    // Base64 encoded image
    const base64Data = content.split(',')[1];
    imageData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
  } else {
    throw new Error('Image content must be a URL or base64 encoded data');
  }

  // Send raw image data to captioning API
  const result = await hfApiCall(env, model, imageData, true);

  return {
    modality: 'image-to-text',
    model,
    provider: 'huggingface',
    source: content.substring(0, 100),
    caption: Array.isArray(result) ? result[0]?.generated_text : result.generated_text,
    fullResult: result,
    timestamp: new Date().toISOString(),
  };
}

async function hfTextToImage(env, content, model, params) {
  const result = await hfApiCall(env, model, {
    inputs: content,
    parameters: {
      num_inference_steps: params.num_steps || 50,
      guidance_scale: params.guidance_scale || 7.5,
      ...params,
    }
  });

  return {
    modality: 'text-to-image',
    model,
    provider: 'huggingface',
    prompt: content,
    image: result.image,
    timestamp: new Date().toISOString(),
  };
}

async function hfAnyToAny(env, content, model, params) {
  // SeamlessM4T supports multiple modalities
  const result = await hfApiCall(env, model, {
    inputs: content,
    parameters: {
      task: params.task || 'text2text',
      tgt_lang: params.target_language || 'eng',
      ...params,
    }
  });

  return {
    modality: 'any-to-any',
    model,
    provider: 'huggingface',
    input: content.substring(0, 200),
    result: result,
    supportedTasks: ['text2text', 'speech2text', 'text2speech', 'speech2speech'],
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to extract video ID from YouTube URL
export function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
