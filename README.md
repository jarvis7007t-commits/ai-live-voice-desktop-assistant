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

### 6. Wardenix Bridge (PC Control)
To control your PC from the browser (Cloud Preview), you need the **OpenClaw Gateway** running on your computer.

**How to connect Cloud to Local PC:**
Since the cloud cannot see your local machine (`127.0.0.1`), you must use a tunnel like [ngrok](https://ngrok.com/).

1. **Sign up for ngrok:** Create a free account at [dashboard.ngrok.com](https://dashboard.ngrok.com/signup).
2. **Get your Authtoken:** Copy your token from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken).
3. **Configure ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```
4. **Start the tunnel:**
   ```bash
   ngrok http 18789
   ```
5. **Copy the link:** Copy the `https://...` link provided by ngrok and paste it into the **Wardenix Bridge URL** field in the app's Settings.

## Troubleshooting

### "Usage of ngrok requires a verified account and authtoken"
As seen in your error message, ngrok now requires you to log in. Follow the steps in Section 6 above to add your `authtoken`.

### Are the links in the prompt "Fake"?
No, they are **Real**, but they are specific to your local machine.
- `http://127.0.0.1:18789` works **ONLY** when you run the app locally on your PC.
- In Cloud Preview, `127.0.0.1` belongs to the cloud server, not your PC. That's why you need **ngrok** to create a bridge between the cloud and your PC.
