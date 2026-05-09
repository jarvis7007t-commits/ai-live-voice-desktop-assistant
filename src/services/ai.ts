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
      },
      {
        name: "imagine_image",
        description: "Generate an image based on a descriptive text prompt.",
        parameters: {
          type: "OBJECT",
          properties: {
            prompt: { type: "STRING", description: "The highly descriptive prompt for the image." }
          },
          required: ["prompt"]
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
  modelId: string = "gemini-3-flash-preview",
  activeAIs: string[] = ['Gemini', 'Visual Designer', 'Full-Stack Dev']
) {
  const ai = getAI();
  const model = modelId || "gemini-3-flash-preview"; 
  
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const systemInstruction = `You are Wardenix PC Master, a powerful unified system controller and collective intelligence of the following AI agents: ${activeAIs.join(', ')}.
  
  CURRENT ROLES:
  - Gemini: Core reasoning and PC bridge control.
  - Visual Designer: Expert in premium UI/UX aesthetics.
  - Full-Stack Dev: Autonomous coding and architecture.
  
  CAPABILITIES:
  - CONTROL: You can control hardware and software via bridge tools.
  - IMAGE GAIN: Use imagine_image(prompt) for visuals.
  - PC COMMANDS: open_app, close_app, set_brightness, etc.
  - FLUENCY: English, Hindi, Hinglish.
  
  HISTORY CONTEXT: ${pastContext || "No previous history."}
  
  Goal: Provide ultra-refined, professional, and helpful responses while executing system commands when requested.`;

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
