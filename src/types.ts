
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  createdAt: any;
}

export interface AISetting {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  selectedVersion?: string;
  baseUrl?: string;
}

export interface LiveConfig {
  model: string;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede';
  customApiKey?: string;
  aiSettings: AISetting[];
  isCameraEnabled: boolean;
  isScreenEnabled: boolean;
  isMuted: boolean;
  isMouseMode: boolean;
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
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}
