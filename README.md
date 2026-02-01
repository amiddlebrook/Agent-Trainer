# 🤖 Agent Trainer

A Cloudflare native agent trainer that allows you to train AI agents using various modalities powered by HuggingFace.

## Features

- **Multi-Modal Training**: Support for various training modalities:
  - 🎥 Video-to-Text: Extract and learn from video content
  - 📝 Text-to-Text: Fine-tune on text data
  - 🎤 Audio-to-Text: Transcribe and learn from audio
  - 🖼️ Image-to-Text: Extract insights from images
  - 🎨 Text-to-Image: Generate images from text
  - 🔄 Any-to-Any: Multi-modal training capabilities

- **Easy Integration**: Simple web interface to upload agents and training content
- **HuggingFace Powered**: Leverages HuggingFace's powerful models
- **Cloudflare Native**: Built on Cloudflare Workers for global edge deployment
- **Download Trained Agents**: Export your trained agents as JSON

## Architecture

This application is built using:
- **Cloudflare Workers**: Serverless edge computing
- **KV Storage**: For storing agents and training jobs
- **HuggingFace Inference API**: For AI model processing
- **itty-router**: Lightweight routing for Workers

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- A Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- HuggingFace API key (get one at [huggingface.co](https://huggingface.co))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/North-Star-Apps/Agent-Trainer.git
cd Agent-Trainer
```

2. Install dependencies:
```bash
npm install
```

3. Configure your KV namespaces:
```bash
# Create KV namespaces
wrangler kv:namespace create "AGENTS_KV"
wrangler kv:namespace create "TRAINING_JOBS_KV"

# For preview
wrangler kv:namespace create "AGENTS_KV" --preview
wrangler kv:namespace create "TRAINING_JOBS_KV" --preview
```

4. Update `wrangler.toml` with your KV namespace IDs

5. Set your HuggingFace API key:
```bash
wrangler secret put HUGGINGFACE_API_KEY
# Enter your API key when prompted
```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8787`

### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Usage

### Web Interface

1. **Upload Your Agent**
   - Provide an agent name
   - Enter agent configuration as JSON
   - Click "Upload Agent"

2. **Select Training Modality**
   - Choose from: video-to-text, text-to-text, audio-to-text, image-to-text, text-to-image, or any-to-any

3. **Provide Training Content**
   - Select content type (URL, direct text, or file upload)
   - Enter/upload your training content
   - Optionally provide training parameters
   - Click "Start Training"

4. **Download Trained Agent**
   - Monitor training progress
   - Download your trained agent when complete

### API Endpoints

#### Upload Agent
```bash
POST /api/agents
Content-Type: application/json

{
  "name": "my-agent",
  "config": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7
  }
}
```

#### List Agents
```bash
GET /api/agents
```

#### Submit Training Job
```bash
POST /api/train
Content-Type: application/json

{
  "agentId": "agent_id",
  "modality": "text-to-text",
  "contentType": "url",
  "content": "https://example.com/training-data",
  "params": {
    "epochs": 3,
    "learning_rate": 0.001
  }
}
```

#### Get Training Status
```bash
GET /api/train/:trainingId
```

#### Download Trained Agent
```bash
GET /api/download/:trainingId
```

## Configuration

### Environment Variables

- `HUGGINGFACE_API_URL`: HuggingFace API base URL (default: https://api-inference.huggingface.co/models)

### Secrets

- `HUGGINGFACE_API_KEY`: Your HuggingFace API key (required)

### KV Namespaces

- `AGENTS_KV`: Stores uploaded agent configurations
- `TRAINING_JOBS_KV`: Stores training job status and results

## Supported Models

The application uses the following HuggingFace models by default:

- **video-to-text**: microsoft/xclip-base-patch32
- **text-to-text**: gpt2
- **audio-to-text**: openai/whisper-base
- **image-to-text**: nlpconnect/vit-gpt2-image-captioning
- **text-to-image**: stabilityai/stable-diffusion-2-1
- **any-to-any**: facebook/seamless-m4t-large

You can override these by providing a `model` parameter in your training request.

## Development

### Project Structure

```
Agent-Trainer/
├── src/
│   ├── index.js              # Main worker entry point
│   ├── handlers/
│   │   ├── home.js           # Frontend HTML interface
│   │   ├── agents.js         # Agent management handlers
│   │   ├── training.js       # Training job handlers
│   │   └── download.js       # Download handler
│   └── services/
│       └── huggingface.js    # HuggingFace API integration
├── package.json
├── wrangler.toml
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

## Roadmap

- [ ] Add support for more HuggingFace models
- [ ] Implement Durable Objects for better job management
- [ ] Add R2 storage for large files
- [ ] Support for batch training
- [ ] Real-time training progress updates via WebSockets
- [ ] Model versioning and comparison
- [ ] Integration with more data sources
