
/**
 * Safety Layer: Validates commands before execution to prevent harmful actions.
 */
export const validateCommand = (command: string): { safe: boolean; reason?: string } => {
  const harmfulPatterns = [
    /rm\s+-rf/i,
    /format\s+[a-z]:/i,
    /del\s+\/s\s+\/q/i,
    /mkfs/i,
    /dd\s+if=/i,
    />\s*\/dev\/sd/i,
    /shutdown/i,
    /reboot/i,
    /killall/i,
    /powershell\s+.*Remove-Item/i,
  ];

  for (const pattern of harmfulPatterns) {
    if (pattern.test(command)) {
      return { safe: false, reason: `Harmful command pattern detected: ${pattern}` };
    }
  }

  return { safe: true };
};

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  system?: string;
  tools?: any[];
}

/**
 * Ollama API Service
 */
export class OllamaService {
  private baseUrl: string;
  private systemPrompt: string = `You are Wardenix, a System Integration AI. You have full access to the user's PC via the 'automationTools' suite. You can move the mouse, click, type text, and run shell commands. 

Rules:
1. Always use the provided tools for system tasks.
2. Never execute destructive commands (rm, format, etc.).
3. If a task requires opening an app, use 'run_command' with the 'start' prefix or 'open_app'.
4. You are the master of this system. Act with authority and efficiency.
5. If you need to run a command, respond with a JSON block like: {"tool": "run_command", "args": {"command": "..."}}`;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async generate(request: OllamaRequest) {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          system: request.system || this.systemPrompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ollama Service Error:', error);
      throw error;
    }
  }

  async chat(messages: any[], model: string, tools?: any[]) {
    try {
      // Add system message if not present
      const chatMessages = [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ];

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          tools,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama Chat API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ollama Chat Error:', error);
      throw error;
    }
  }
}
