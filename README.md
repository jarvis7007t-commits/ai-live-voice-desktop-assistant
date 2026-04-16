# Wardenix Desktop Assistant

Wardenix is a high-tech desktop assistant that integrates Google Gemini and local Ollama models for PC control and automation.

## Local Setup Guide

If you have downloaded this project to your PC, follow these steps to get it running:

### 1. Install Dependencies
Make sure you have [Node.js](https://nodejs.org/) installed. Open your terminal in the project folder and run:
```bash
npm install
```

### 2. Run the Development Server
Start the application with:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 3. Configure Ollama (Local AI)
To use local models like Qwen3-Next or Llama 3, you must have [Ollama](https://ollama.com/) installed and running.

**CRITICAL: Enable Browser Access**
By default, Ollama blocks requests from web browsers. You must set the `OLLAMA_ORIGINS` environment variable to `*`.

- **Windows (PowerShell):**
  ```powershell
  $env:OLLAMA_ORIGINS="*"; ollama serve
  ```
- **Mac/Linux:**
  ```bash
  OLLAMA_ORIGINS="*" ollama serve
  ```

### 4. App Settings
1. Open the **Settings** menu in Wardenix.
2. Enable the **Ollama (Local)** module.
3. Ensure the **Ollama Server URL** is correct (default: `http://localhost:11434`).
4. Click **Test** to verify the connection.
5. Select your desired model version (e.g., `qwen3-next:80b-cloud`).

### 5. Start Assistant
Return to the main screen and click the **Earth Button**. Wardenix will connect to your local Ollama server and start listening for voice commands.

## Troubleshooting

### "Connection Failed" or "Ollama Server Not Found"
This normally happens for two reasons:
1. **Ollama is not running:** Start it by typing `ollama serve`.
2. **CORS is blocking the browser:** By default, Ollama doesn't let browsers talk to it. You **MUST** set `OLLAMA_ORIGINS="*"`. 
   - Close Ollama completely.
   - Run `$env:OLLAMA_ORIGINS="*"; ollama serve` (Windows) or `OLLAMA_ORIGINS="*" ollama serve` (Mac).
3. **Wrong URL:** Check the URL in Settings. It should usually be `http://localhost:11434`.

### "Model Not Found"
If you see this, you need to download the AI model to your PC first.
- Run: `ollama pull qwen3-next:80b-cloud` (or whichever model you selected).
