import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

// PC Control Tool Specializations (Formatted for internal generateContent API)
const pcControlTools = [
  {
    functionDeclarations: [
      {
        name: "open_app",
        description: "Launch an allowed application on the PC.",
        parameters: {
          type: "OBJECT",
          properties: {
            target: { type: "STRING", description: "Key name of the app (e.g., chrome, notepad, calculator)." }
          },
          required: ["target"]
        }
      },
      {
        name: "close_app",
        description: "Terminate an allowed process/application.",
        parameters: {
          type: "OBJECT",
          properties: {
            target: { type: "STRING", description: "Name of the process to close (e.g., notepad, chrome)." }
          },
          required: ["target"]
        }
      },
      {
        name: "set_brightness",
        description: "Adjust the PC screen brightness level.",
        parameters: {
          type: "OBJECT",
          properties: {
            value: { type: "INTEGER", description: "Brightness percentage (10-100)." }
          },
          required: ["value"]
        }
      },
      {
        name: "wifi_toggle",
        description: "Turn Wi-Fi on or off.",
        parameters: {
          type: "OBJECT",
          properties: {
            target: { type: "STRING", enum: ["on", "off"], description: "The desired Wi-Fi state." }
          },
          required: ["target"]
        }
      },
      {
        name: "get_system_info",
        description: "Retrieve CPU, RAM, Disk, and Battery statistics from the PC.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "lock_pc",
        description: "Immediately lock the Windows workstation.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "sleep_pc",
        description: "Put the PC into sleep mode.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "power_action",
        description: "Shutdown or Restart the PC.",
        parameters: {
          type: "OBJECT",
          properties: {
            action: { type: "STRING", enum: ["shutdown", "restart"], description: "The power action to take." }
          },
          required: ["action"]
        }
      },
      {
        name: "open_web_link",
        description: "Search the web or open a specific URL in the default browser.",
        parameters: {
          type: "OBJECT",
          properties: {
            url: { type: "STRING", description: "The search query or full URL." }
          },
          required: ["url"]
        }
      }
    ]
  }
];

let genAI: any = null;
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
  modelId: string = "gemini-3-flash-preview"
) {
  const ai = getAI();
  const model = modelId || "gemini-3-flash-preview"; 
  
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
  - For sensitive actions like shutdown or restart, confirm with the user first unless they sound urgent.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        thinkingConfig: useThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
        tools: pcControlTools,
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const text = response.text || "";
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      return { 
        text: text || "Executing system command...", 
        calls: functionCalls.map((f: any) => ({
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
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ role: 'user', parts: [{ text: `Say: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
