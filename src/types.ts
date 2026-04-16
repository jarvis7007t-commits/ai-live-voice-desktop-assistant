
export interface TranscriptionEntry {
  role: 'user' | 'model';
  text: string;
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  SETTINGS = 'SETTINGS',
  AUTH = 'AUTH',
}

export interface AISetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
  apiKey?: string;
  baseUrl?: string;
  versions?: { id: string; name: string }[];
  selectedVersion?: string;
}

export interface LiveConfig {
  model: string;
  systemInstruction?: string;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  isCameraEnabled: boolean;
  isScreenEnabled: boolean;
  isMuted: boolean;
  isMouseMode: boolean;
  aiSettings: AISetting[];
  // New features based on image and request
  recordingQuality: 'SD' | 'HD' | '4K';
  instantShareLink: boolean;
  highlightMouseCursor: boolean;
  minimalDock: boolean;
  useProxyServer: boolean;
  autoStart: boolean;
  hardwareAcceleration: boolean;
  frameRate: 30 | 60 | 120;
  audioBitrate: 128 | 256 | 320;
  showWatermark: boolean;
  countdownTimer: number;
  showWebcamOverlay: boolean;
  webcamSize: number;
  language: string;
  isDeveloperMode: boolean;
  isChatWindowOpen: boolean;
  customApiKey?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  isLoggedIn: boolean;
}
