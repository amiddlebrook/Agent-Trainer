export async function handleHome() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Trainer - Cloudflare Native</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .card h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        input[type="text"],
        input[type="file"],
        select,
        textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input[type="text"]:focus,
        select:focus,
        textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 14px 30px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        .modality-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .modality-option {
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }
        
        .modality-option:hover {
            border-color: #667eea;
            background: #f5f7ff;
        }
        
        .modality-option.selected {
            border-color: #667eea;
            background: #667eea;
            color: white;
        }
        
        .modality-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .status-card {
            background: #f5f7ff;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            display: none;
        }
        
        .status-card.visible {
            display: block;
        }
        
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            margin: 15px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
        }
        
        .alert {
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .alert-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .download-btn {
            background: #28a745;
            margin-top: 15px;
        }
        
        .download-btn:hover {
            box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Agent Trainer</h1>
            <p>Train your AI agents with multi-modal capabilities powered by HuggingFace</p>
        </div>
        
        <div class="card">
            <h2>Step 1: Upload Your Agent</h2>
            <div class="form-group">
                <label for="agentName">Agent Name</label>
                <input type="text" id="agentName" placeholder="my-awesome-agent" />
            </div>
            <div class="form-group">
                <label for="agentConfig">Agent Configuration (JSON)</label>
                <textarea id="agentConfig" placeholder='{"model": "gpt-3.5-turbo", "temperature": 0.7, ...}'></textarea>
            </div>
            <button onclick="uploadAgent()">Upload Agent</button>
        </div>
        
        <div class="card">
            <h2>Step 2: Select Training Modality</h2>
            <div class="modality-grid" id="modalityGrid">
                <div class="modality-option" data-modality="video-to-text">
                    <div class="modality-icon">🎥</div>
                    <strong>Video to Text</strong>
                    <p>Extract text from videos</p>
                </div>
                <div class="modality-option" data-modality="text-to-text">
                    <div class="modality-icon">📝</div>
                    <strong>Text to Text</strong>
                    <p>Fine-tune on text data</p>
                </div>
                <div class="modality-option" data-modality="audio-to-text">
                    <div class="modality-icon">🎤</div>
                    <strong>Audio to Text</strong>
                    <p>Transcribe audio content</p>
                </div>
                <div class="modality-option" data-modality="image-to-text">
                    <div class="modality-icon">🖼️</div>
                    <strong>Image to Text</strong>
                    <p>Extract text from images</p>
                </div>
                <div class="modality-option" data-modality="text-to-image">
                    <div class="modality-icon">🎨</div>
                    <strong>Text to Image</strong>
                    <p>Generate images from text</p>
                </div>
                <div class="modality-option" data-modality="any-to-any">
                    <div class="modality-icon">🔄</div>
                    <strong>Any to Any</strong>
                    <p>Multi-modal training</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>Step 3: Provide Training Content</h2>
            <div class="form-group">
                <label for="contentType">Content Type</label>
                <select id="contentType" onchange="updateContentInput()">
                    <option value="url">URL (YouTube, etc.)</option>
                    <option value="text">Direct Text Input</option>
                    <option value="file">File Upload</option>
                </select>
            </div>
            <div class="form-group" id="urlInput">
                <label for="contentUrl">Content URL</label>
                <input type="text" id="contentUrl" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div class="form-group" id="textInput" style="display: none;">
                <label for="contentText">Training Text</label>
                <textarea id="contentText" placeholder="Enter your training text here..."></textarea>
            </div>
            <div class="form-group" id="fileInput" style="display: none;">
                <label for="contentFile">Upload File</label>
                <input type="file" id="contentFile" />
            </div>
            <div class="form-group">
                <label for="trainingParams">Training Parameters (Optional)</label>
                <textarea id="trainingParams" placeholder='{"epochs": 3, "learning_rate": 0.001, ...}'></textarea>
            </div>
            <button onclick="startTraining()">Start Training</button>
        </div>
        
        <div id="statusCard" class="status-card">
            <h3>Training Status</h3>
            <div id="statusMessage"></div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressBar" style="width: 0%;">0%</div>
            </div>
            <div id="trainingDetails"></div>
            <button id="downloadBtn" class="download-btn" style="display: none;" onclick="downloadAgent()">
                Download Trained Agent
            </button>
        </div>
    </div>
    
    <script>
        let selectedModality = null;
        let currentAgentId = null;
        let currentTrainingId = null;
        
        // Initialize modality selection
        document.querySelectorAll('.modality-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.modality-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                selectedModality = this.dataset.modality;
            });
        });
        
        function updateContentInput() {
            const contentType = document.getElementById('contentType').value;
            document.getElementById('urlInput').style.display = contentType === 'url' ? 'block' : 'none';
            document.getElementById('textInput').style.display = contentType === 'text' ? 'block' : 'none';
            document.getElementById('fileInput').style.display = contentType === 'file' ? 'block' : 'none';
        }
        
        async function uploadAgent() {
            const name = document.getElementById('agentName').value;
            const config = document.getElementById('agentConfig').value;
            
            if (!name || !config) {
                alert('Please provide agent name and configuration');
                return;
            }
            
            try {
                const response = await fetch('/api/agents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, config: JSON.parse(config) })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    currentAgentId = result.agentId;
                    showAlert('success', 'Agent uploaded successfully! ID: ' + result.agentId);
                } else {
                    showAlert('error', 'Error uploading agent: ' + result.error);
                }
            } catch (error) {
                showAlert('error', 'Error uploading agent: ' + error.message);
            }
        }
        
        async function startTraining() {
            if (!currentAgentId) {
                alert('Please upload an agent first');
                return;
            }
            
            if (!selectedModality) {
                alert('Please select a training modality');
                return;
            }
            
            const contentType = document.getElementById('contentType').value;
            let content = null;
            
            if (contentType === 'url') {
                content = document.getElementById('contentUrl').value;
            } else if (contentType === 'text') {
                content = document.getElementById('contentText').value;
            } else if (contentType === 'file') {
                const file = document.getElementById('contentFile').files[0];
                if (file) {
                    // In a real implementation, you'd upload the file first
                    content = await readFileAsText(file);
                }
            }
            
            if (!content) {
                alert('Please provide training content');
                return;
            }
            
            const params = document.getElementById('trainingParams').value;
            
            try {
                const response = await fetch('/api/train', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentId: currentAgentId,
                        modality: selectedModality,
                        contentType,
                        content,
                        params: params ? JSON.parse(params) : {}
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    currentTrainingId = result.trainingId;
                    showAlert('success', 'Training started! ID: ' + result.trainingId);
                    showStatusCard();
                    pollTrainingStatus();
                } else {
                    showAlert('error', 'Error starting training: ' + result.error);
                }
            } catch (error) {
                showAlert('error', 'Error starting training: ' + error.message);
            }
        }
        
        function showStatusCard() {
            document.getElementById('statusCard').classList.add('visible');
        }
        
        async function pollTrainingStatus() {
            if (!currentTrainingId) return;
            
            try {
                const response = await fetch('/api/train/' + currentTrainingId);
                const result = await response.json();
                
                updateProgress(result.progress || 0, result.status);
                document.getElementById('trainingDetails').innerHTML = 
                    '<p><strong>Status:</strong> ' + result.status + '</p>' +
                    '<p><strong>Modality:</strong> ' + result.modality + '</p>' +
                    (result.message ? '<p>' + result.message + '</p>' : '');
                
                if (result.status === 'completed') {
                    document.getElementById('downloadBtn').style.display = 'block';
                    showAlert('success', 'Training completed successfully!');
                } else if (result.status === 'failed') {
                    showAlert('error', 'Training failed: ' + (result.error || 'Unknown error'));
                } else {
                    // Continue polling
                    setTimeout(pollTrainingStatus, 3000);
                }
            } catch (error) {
                console.error('Error polling status:', error);
                setTimeout(pollTrainingStatus, 3000);
            }
        }
        
        function updateProgress(percent, status) {
            const progressBar = document.getElementById('progressBar');
            progressBar.style.width = percent + '%';
            progressBar.textContent = percent + '%';
            document.getElementById('statusMessage').textContent = status;
        }
        
        async function downloadAgent() {
            if (!currentTrainingId) return;
            
            try {
                const response = await fetch('/api/download/' + currentTrainingId);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'trained-agent-' + currentTrainingId + '.json';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                showAlert('error', 'Error downloading agent: ' + error.message);
            }
        }
        
        function showAlert(type, message) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-' + type;
            alertDiv.textContent = message;
            
            const container = document.querySelector('.container');
            container.insertBefore(alertDiv, container.firstChild);
            
            setTimeout(() => alertDiv.remove(), 5000);
        }
        
        function readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        }
    </script>
</body>
</html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
