
/**
 * Wardenix Bridge Service
 * Handles communication with the local Wardenix Bridge (OpenClaw Gateway)
 */
export class WardenixBridgeService {
  private baseUrl: string;
  private wsUrl: string;
  private socket: WebSocket | null = null;

  constructor(baseUrl: string = 'http://127.0.0.1:18789') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    // Derive WS URL from Base URL
    const protocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = this.baseUrl.replace(/^https?:\/\//, '');
    this.wsUrl = `${protocol}://${host}/ws`;
  }

  async checkStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      return await response.json();
    } catch (error) {
      console.error('Wardenix Bridge Status Error:', error);
      const isLocal = this.baseUrl.includes('127.0.0.1') || this.baseUrl.includes('localhost');
      if (isLocal && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('Bridge Offline: Cloud preview cannot reach 127.0.0.1. Use a public tunnel (ngrok) or run app locally.');
      }
      throw new Error('PC Bridge is Offline. Please ensure OpenClaw Gateway is running.');
    }
  }

  async chat(messages: any[], model: string = 'wardenix-kernel') {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Wardenix Bridge API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Wardenix Bridge Chat Error:', error);
      throw error;
    }
  }

  /**
   * Connects to the real-time websocket for low-latency processing
   */
  connectWS(onMessage: (data: any) => void, onError: (error: any) => void) {
    this.socket = new WebSocket(this.wsUrl);
    
    this.socket.onopen = () => {
      console.log('Wardenix Bridge WebSocket Connected');
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('WS Message Parse Error:', e);
      }
    };

    this.socket.onerror = (error) => {
      console.error('Wardenix Bridge WebSocket Error:', error);
      onError(error);
    };

    this.socket.onclose = () => {
      console.log('Wardenix Bridge WebSocket Closed');
    };
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
