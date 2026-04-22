import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

// PC Control Tool Specializations
const pcControlTools = [
  {
    functionDeclarations: [
      {
        name: "open_app",
        description: "Launch an allowed application on the PC.",
        parameters: {
          type: "object",
          properties: {
            target: { type: "string", description: "Key name of the app (e.g., chrome, notepad, calculator)." }
          },
          required: ["target"]
        }
      },
      {
        name: "close_app",
        description: "Terminate an allowed process/application.",
        parameters: {
          type: "object",
          properties: {
            target: { type: "string", description: "Name of the process to close (e.g., notepad, chrome)." }
          },
          required: ["target"]
        }
      },
      {
        name: "set_brightness",
        description: "Adjust the PC screen brightness level.",
        parameters: {
          type: "object",
          properties: {
            value: { type: "integer", description: "Brightness percentage (10-100)." }
          },
          required: ["value"]
        }
      },
      {
        name: "wifi_toggle",
        description: "Turn Wi-Fi on or off.",
        parameters: {
          type: "object",
          properties: {
            target: { type: "string", enum: ["on", "off"], description: "The desired Wi-Fi state." }
          },
          required: ["target"]
        }
      },
      {
        name: "get_system_info",
        description: "Retrieve CPU, RAM, Disk, and Battery statistics from the PC.",
        parameters: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "lock_pc",
        description: "Immediately lock the Windows workstation.",
        parameters: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "sleep_pc",
        description: "Put the PC into sleep mode.",
        parameters: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "power_action",
        description: "Shutdown or Restart the PC.",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["shutdown", "restart"], description: "The power action to take." }
          },
          required: ["action"]
        }
      },
      {
        name: "open_web_link",
        description: "Search the web or open a specific URL in the default browser.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "The search query or full URL." }
          },
          required: ["url"]
        }
      }
    ]
  }
];

let genAI: GoogleGenAI | null = null;
let currentKey: string | null = null;

export function getAI(customKey?: string) {
  const keyToUse = customKey || localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
  if (!keyToUse) throw new Error("GEMINI_API_KEY is not defined");

  if (!genAI || currentKey !== keyToUse) {
    currentKey = keyToUse;
    genAI = new GoogleGenAI({ apiKey: keyToUse });
  }
  return genAI;
}

export async function generateChatResponse(
  messages: { role: string; content: string }[], 
  useThinking: boolean = false, 
  pastContext: string = "",
  modelId: string = "gemini-2.0-flash-exp"
) {
  const ai = getAI();
  const modelName = modelId.includes('gemini') ? modelId : "gemini-2.0-flash-exp"; 
  
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const systemInstruction = `You are VocalAI PC Master, a powerful system controller based on the Safe PC Assistant protocol.
  
  HISTORY CONTEXT: ${pastContext || "No previous history found."}
  
  CAPABILITIES:
  - You can control hardware and software from A to Z using the provided tools.
  - If a user asks to "Open Chrome", use open_app(target="chrome").
  - If a user asks to "Close Notepad", use close_app(target="notepad").
  - If a user asks to "Search YouTube for [Topic]", use open_web_link(url="https://www.youtube.com/results?search_query=[Topic]").
  - You are fluent in Hindi, English, and Hinglish.
  - Always explain the action you are taking clearly.
  - For sensitive actions like shutdown or restart, confirm with the user first unless they sound urgent.
  
  When the user asks "What did I say in the last set?" or similar memory queries, refer to the HISTORY CONTEXT above.`;

  try {
    const generativeModel = ai.getGenerativeModel({
      model: modelName,
      systemInstruction,
      tools: pcControlTools,
    });

    const result = await generativeModel.generateContent({
      contents,
      generationConfig: {
        thinkingConfig: useThinking ? { includeThoughts: true } : undefined,
      },
    });

    const response = result.response;
    const text = response.text() || "";
    const functionCalls = response.getFunctionCalls();

    if (functionCalls && functionCalls.length > 0) {
      return { 
        text: text || "Executing system command...", 
        calls: functionCalls.map(f => ({
          name: f.name,
          args: f.args
        }))
      };
    }
    return { text };
  } catch (error: any) {
    console.error("AI Response Error:", error);
    throw error;
  }
}

export async function generateTTS(text: string, voice: string) {
  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Say: ${text}` }] }],
      generationConfig: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    });

    const base64Audio = response.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
