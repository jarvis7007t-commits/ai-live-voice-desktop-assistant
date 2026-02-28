
export interface TranscriptionEntry {
  role: 'user' | 'model';
  text: string;
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface LiveConfig {
  model: string;
  systemInstruction?: string;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  isCameraEnabled: boolean;
  isScreenEnabled: boolean;
  isMuted: boolean;
  isMouseMode: boolean;
}
