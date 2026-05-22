import express from "express";
import path from "path";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // GitHub Tools Definitions
  const githubTools = [
    {
      name: "create_github_repository",
      description: "Creates a new repository on GitHub for the authenticated user.",
      parameters: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "The name of the repository." },
          description: { type: "STRING", description: "A short description of the repository." },
          isPrivate: { type: "BOOLEAN", description: "Whether the repository should be private." }
        },
        required: ["name"]
      }
    },
    {
      name: "upload_file_to_github",
      description: "Uploads or updates a file in a GitHub repository.",
      parameters: {
        type: "OBJECT",
        properties: {
          owner: { type: "STRING", description: "The owner of the repository (username)." },
          repo: { type: "STRING", description: "The repository name." },
          path: { type: "STRING", description: "The file path in the repository (e.g., 'src/main.ts')." },
          content: { type: "STRING", description: "The content of the file (plain text)." },
          message: { type: "STRING", description: "The commit message." }
        },
        required: ["owner", "repo", "path", "content", "message"]
      }
    },
    {
      name: "get_github_user",
      description: "Gets the authenticated GitHub user profile information.",
      parameters: { type: "OBJECT", properties: {} }
    }
  ];

  // Map function names to actual logic
  const githubActions: Record<string, (args: any, token: string) => Promise<any>> = {
    get_github_user: async (_, token) => {
      const res = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` }
      });
      return res.data;
    },
    create_github_repository: async (args, token) => {
      const res = await axios.post("https://api.github.com/user/repos", {
        name: args.name,
        description: args.description,
        private: !!args.isPrivate,
        auto_init: true
      }, {
        headers: { Authorization: `token ${token}` }
      });
      return res.data;
    },
    upload_file_to_github: async (args, token) => {
      // First, try to get the file to see if it exists (for the SHA)
      let sha: string | undefined;
      try {
        const getRes = await axios.get(`https://api.github.com/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
          headers: { Authorization: `token ${token}` }
        });
        sha = getRes.data.sha;
      } catch (e) {
        // File doesn't exist, which is fine for creation
      }

      const res = await axios.put(`https://api.github.com/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
        message: args.message,
        content: Buffer.from(args.content).toString('base64'),
        sha
      }, {
        headers: { Authorization: `token ${token}` }
      });
      return res.data;
    }
  };

  // Helper function for sending message with retries and model fallbacks
  async function sendMessageWithModelFallback(message: string, initialModel: string, history: any[], githubToken?: string) {
    // Keep initialModel, but normalize deprecated/unsupported ones
    let normalizedInitialModel = initialModel;
    if (initialModel === "gemini-1.5-flash") {
      normalizedInitialModel = "gemini-3.5-flash";
    } else if (initialModel === "gemini-1.5-pro" || initialModel === "gemini-2.5-pro") {
      normalizedInitialModel = "gemini-3.1-pro-preview";
    }

    const modelsToTry = [
      normalizedInitialModel,
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite", // Very reliable, high availability
      "gemini-flash-latest" // Alternate alias fallback
    ];
    
    // Filter duplicates
    const uniqueModels = Array.from(new Set(modelsToTry));
    let lastError: any = null;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    for (const modelId of uniqueModels) {
      let retries = 0;
      const maxRetries = 1; // Only retry once under other recoverable conditions to keep responses fast
      
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        apiVersion: 'v1beta',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      
      while (retries <= maxRetries) {
        try {
          console.log(`Attempting message with model: ${modelId} (Retry: ${retries})`);
          
          const tools: any[] = [];
          if (githubToken) {
            tools.push({ functionDeclarations: githubTools });
          }

          const chatConfig: any = {
            model: modelId,
            history: history,
            config: {}
          };

          if (tools.length > 0) {
            chatConfig.config.tools = tools;
          }

          if (githubToken) {
            chatConfig.config.systemInstruction = "You are an AI assistant connected to the user's GitHub account. You can create repositories and upload files. When the user wants to upload code or launch a project, use the provided tools. Always confirm repo details with the user if they're not specified.";
          }

          const chat = ai.chats.create(chatConfig);
          let result = await chat.sendMessage({ message });
          
          // Handle Function Calls
          if (result.functionCalls && githubToken) {
            const functionResponses = [];
            for (const call of result.functionCalls) {
              const action = githubActions[call.name];
              if (action) {
                try {
                  console.log(`Executing tool: ${call.name}`);
                  const toolResult = await action(call.args, githubToken);
                  functionResponses.push({
                    name: call.name,
                    response: { content: toolResult },
                    id: call.id
                  });
                } catch (toolError: any) {
                  console.error(`Tool execution failed: ${call.name}`, toolError.response?.data || toolError.message);
                  functionResponses.push({
                    name: call.name,
                    response: { error: toolError.response?.data || toolError.message },
                    id: call.id
                  });
                }
              }
            }

            if (functionResponses.length > 0) {
              result = await chat.sendMessage({
                message: {
                  parts: functionResponses.map(r => ({
                    functionResponse: r
                  }))
                } as any
              });
            }
          }

          return { text: result.text, model: modelId };
        } catch (error: any) {
          lastError = error;
          const status = error.status || (error.message?.includes('503') ? 503 : error.message?.includes('429') ? 429 : 404);
          
          if (status === 429) {
            console.log(`Gemini 429 (Quota Exceeded) on ${modelId}. Falling back immediately to next model...`);
            break; // No retry on 429, retry logic won't clear quota, fall back immediately!
          }
          
          if (status === 503) {
            retries++;
            if (retries <= maxRetries) {
              const delay = 1000;
              console.log(`Gemini 503 error on ${modelId}. Retrying once in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            break; // Try next fallback model
          }
          
          if (status === 404) {
            console.log(`Model ${modelId} returned 404. Trying next fallback...`);
            break; // Try next fallback model
          }

          console.log(`Model ${modelId} failed with status ${status}. Error: ${error.message}`);
          break; // Try next fallback model
        }
      }
    }
    
    throw lastError || new Error("All model fallbacks failed.");
  }

  // Chat API route
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, model: modelId, githubToken } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }

      const formattedHistory = history?.map((item: any) => ({
        role: item.role,
        parts: item.parts.map((p: any) => ({ text: p.text }))
      })) || [];

      const initialModel = modelId || "gemini-1.5-flash";
      const result = await sendMessageWithModelFallback(message, initialModel, formattedHistory, githubToken);

      res.json({ 
        text: result.text, 
        model: result.model,
        note: result.model !== initialModel ? `Fell back to ${result.model}` : undefined
      });
    } catch (error: any) {
      console.error("Gemini API All Fallbacks Failed:", error);
      res.status(500).json({ error: error.message || "An error occurred during communication with Gemini." });
    }
  });

  // GitHub OAuth URL route
  app.get("/api/auth/github/url", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const redirectUri = `${appUrl}/auth/github/callback`;
    
    if (!clientId) {
      return res.status(500).json({ error: "GITHUB_CLIENT_ID is not configured." });
    }

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
    res.json({ url: githubAuthUrl });
  });

  // GitHub OAuth Callback route
  app.get(["/auth/github/callback", "/auth/github/callback/"], async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send("No code provided.");
    }

    try {
      const response = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const { access_token } = response.data;
      
      if (!access_token) {
        throw new Error("Failed to obtain access token.");
      }

      // In a real app, you would store the token in a session or database
      console.log("GitHub OAuth successful, token obtained.");

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f4f4f5; margin: 0;">
            <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); text-align: center;">
              <h1 style="color: #10b981; margin-bottom: 1rem;">Authenticated!</h1>
              <p style="color: #4b5563;">GitHub account connected successfully.</p>
              <p style="color: #9ca3af; font-size: 0.875rem;">This window will close automatically.</p>
            </div>
            <script>
              setTimeout(() => {
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    provider: 'github',
                    token: '${access_token}'
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              }, 1500);
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("GitHub OAuth Callback Error:", error.response?.data || error.message);
      res.status(500).send("Authentication failed.");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
