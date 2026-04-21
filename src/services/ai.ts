import { GoogleGenAI, Modality } from '@google/genai';

const getAI = () => {
  const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

export async function generateChatResponse(messages: { role: string; content: string }[], useThinking: boolean, pastHistoryText: string) {
  try {
    const ai = getAI();
    
    const prompt = pastHistoryText 
      ? `Past Context:\n${pastHistoryText}\n\nCurrent Conversation:\n${messages[messages.length-1].content}`
      : messages[messages.length-1].content;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are Wardenix, a powerful AI assistant. Use the provided history to maintain context."
      }
    });

    return { text: response.text || "" };
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}

export async function generateTTS(text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr') {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say: ${text}` }] }],
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
