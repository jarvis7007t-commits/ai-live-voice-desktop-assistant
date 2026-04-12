import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_URL = "http://localhost:11434/api/chat";

console.log("--- Wardenix Node.js Backend Initializing ---");

app.get('/health', (req, res) => {
  res.json({
    status: "ok",
    backend: "nodejs",
    gemini_configured: !!GEMINI_API_KEY
  });
});

// API routes must be defined BEFORE Vite middleware
app.post('/ask', async (req, res) => {
  const { query, history, useLocalOllama, model, apiKey } = req.body;

  if (!query || query.trim().length < 3) {
    return res.send("");
  }

  // Set up streaming response
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    // 1. Try Ollama if requested
    if (useLocalOllama) {
      try {
        console.log(`[Wardenix] Attempting Ollama with model: ${model}...`);
        const ollamaResponse = await fetch(OLLAMA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || "qwen3.5:9b",
            messages: [
              { role: 'system', content: 'You are Wardenix, a powerful AI assistant.' },
              ...history.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.content || m.text
              })),
              { role: 'user', content: query }
            ],
            stream: true
          })
        });

        if (ollamaResponse.ok && ollamaResponse.body) {
          const reader = ollamaResponse.body.getReader();
          const decoder = new TextDecoder();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  res.write(json.message.content);
                }
                if (json.done) {
                  res.end();
                  return;
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
          return;
        }
      } catch (e) {
        console.log(`[Wardenix] Ollama failed: ${e}. Falling back to Gemini...`);
      }
    }

    // 2. Fallback to Gemini
    const key = apiKey || GEMINI_API_KEY;
    if (!key) {
      res.write("Wardenix: Gemini API Key is not configured. Please add it in Settings.");
      return res.end();
    }

    console.log("[Wardenix] Using Gemini...");
    const ai = new GoogleGenAI({ apiKey: key });

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: [
        { role: 'user', parts: [{ text: 'You are Wardenix, a powerful AI assistant.' }] },
        ...history.map((m: any) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content || m.text }]
        })),
        { role: 'user', parts: [{ text: query }] }
      ]
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();

  } catch (error: any) {
    console.error("[Wardenix] Critical error:", error);
    res.write(`Error: ${error.message}`);
    res.end();
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wardenix server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
