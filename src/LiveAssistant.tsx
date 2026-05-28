import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, Settings, Globe, PhoneOff, MousePointer2, X, Save } from 'lucide-react';
import { SessionStatus, LiveConfig, UserProfile, AISetting, TranscriptionEntry } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio-utils';
import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import ChatWindow from './components/ChatWindow';

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type;
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

// Use the recommended live model for real-time conversation
const MODEL_NAME_DEFAULT = 'gemini-3.1-flash-live-preview';
const FRAME_RATE = 2;

// --- Digital Mouse Tool Declarations ---
const automationTools: FunctionDeclaration[] = [
  {
    name: 'move_mouse',
    parameters: {
      type: Type.OBJECT,
      description: 'Moves the system mouse cursor to specific coordinates. Use this to hover over icons, buttons, or menu items before clicking.',
      properties: {
        x: { type: Type.NUMBER, description: 'Horizontal pixel coordinate (0 to screen width).' },
        y: { type: Type.NUMBER, description: 'Vertical pixel coordinate (0 to screen height).' },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'click_mouse',
    parameters: {
      type: Type.OBJECT,
      description: 'Performs a mouse click at the current position. Set double to true to open applications or files.',
      properties: {
        button: { type: Type.STRING, description: 'left or right', enum: ['left', 'right'] },
        double: { type: Type.BOOLEAN, description: 'Set to true for double-clicking to open apps/folders.' },
      },
      required: ['button'],
    },
  },
  {
    name: 'type_text',
    parameters: {
      type: Type.OBJECT,
      description: 'Types a string of text into the currently focused field.',
      properties: {
        text: { type: Type.STRING, description: 'The text to type.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'scroll_screen',
    parameters: {
      type: Type.OBJECT,
      description: 'Scrolls the screen up or down.',
      properties: {
        direction: { type: Type.STRING, enum: ['up', 'down'] },
        amount: { type: Type.NUMBER, description: 'Pixels to scroll.' },
      },
      required: ['direction', 'amount'],
    },
  },
  {
    name: 'open_url',
    parameters: {
      type: Type.OBJECT,
      description: 'Opens a specific URL in the default web browser.',
      properties: {
        url: { type: Type.STRING, description: 'The URL to open (e.g., https://google.com).' },
      },
      required: ['url'],
    },
  },
  {
    name: 'system_power',
    parameters: {
      type: Type.OBJECT,
      description: 'Controls the system power state (shutdown or restart).',
      properties: {
        action: { type: Type.STRING, enum: ['shutdown', 'restart'], description: 'The power action to perform.' },
      },
      required: ['action'],
    },
  },
  {
    name: 'open_app',
    parameters: {
      type: Type.OBJECT,
      description: 'Opens a specific application on the PC (e.g., VS Code, WhatsApp, Chrome).',
      properties: {
        name: { type: Type.STRING, description: 'The name or path of the application to open.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'press_key',
    parameters: {
      type: Type.OBJECT,
      description: 'Presses a special key (e.g., enter, tab, esc, backspace).',
      properties: {
        key: { type: Type.STRING, description: 'The key to press (e.g., enter, tab, escape, backspace, up, down, left, right).' },
      },
      required: ['key'],
    },
  },
  {
    name: 'set_volume',
    parameters: {
      type: Type.OBJECT,
      description: 'Sets the system volume level.',
      properties: {
        level: { type: Type.NUMBER, description: 'Volume level from 0 to 100.' },
      },
      required: ['level'],
    },
  },
  {
    name: 'set_brightness',
    parameters: {
      type: Type.OBJECT,
      description: 'Sets the screen brightness level.',
      properties: {
        level: { type: Type.NUMBER, description: 'Brightness level from 0 to 100.' },
      },
      required: ['level'],
    },
  },
  {
    name: 'toggle_wifi',
    parameters: {
      type: Type.OBJECT,
      description: 'Enables or disables WiFi.',
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'True to enable, False to disable.' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'toggle_bluetooth',
    parameters: {
      type: Type.OBJECT,
      description: 'Enables or disables Bluetooth.',
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'True to enable, False to disable.' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'toggle_camera',
    parameters: {
      type: Type.OBJECT,
      description: 'Enables or disables the system camera.',
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'True to enable, False to disable.' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'toggle_microphone',
    parameters: {
      type: Type.OBJECT,
      description: 'Mutes or unmutes the system microphone.',
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'True to unmute, False to mute.' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'manage_file',
    parameters: {
      type: Type.OBJECT,
      description: 'Creates, writes to, or deletes files on the PC. Use this for coding and project management.',
      properties: {
        action: { type: Type.STRING, enum: ['create', 'write', 'delete'], description: 'The file action to perform.' },
        filePath: { type: Type.STRING, description: 'The full path to the file.' },
        content: { type: Type.STRING, description: 'The content to write (for create/write actions).' },
      },
      required: ['action', 'filePath'],
    },
  },
  {
    name: 'run_command',
    parameters: {
      type: Type.OBJECT,
      description: 'Executes a shell command in the terminal. Use this for advanced system tasks, installing packages, or running scripts.',
      properties: {
        command: { type: Type.STRING, description: 'The shell command to execute.' },
      },
      required: ['command'],
    },
  }
];

interface LiveAssistantProps {
  onClose: () => void;
  onSaveLiveConversation?: (transcriptions: TranscriptionEntry[]) => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose, onSaveLiveConversation }) => {
  const queryParams = new URLSearchParams(window.location.search);
  const isCameraView = queryParams.get('view') === 'camera';

  // --- MAIN ASSISTANT LOGIC ---
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [user, setUser] = useState<UserProfile>({
    email: '',
    name: '',
    isLoggedIn: false
  });

  const [sessionTranscriptions, setSessionTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  const sessionTranscriptionsRef = useRef<TranscriptionEntry[]>([]);
  const isSavedRef = useRef(false);

  useEffect(() => {
    sessionTranscriptionsRef.current = sessionTranscriptions;
  }, [sessionTranscriptions]);

  useEffect(() => {
    isSavedRef.current = isSaved;
  }, [isSaved]);

  const saveToHistoryLocally = (entries: TranscriptionEntry[]) => {
    if (!entries || entries.length === 0) return;
    try {
      const pRaw = localStorage.getItem('lumax_codex_projects');
      let currentProjects: any[] = [];
      if (pRaw) {
        currentProjects = JSON.parse(pRaw);
        if (!Array.isArray(currentProjects)) currentProjects = [];
      }
      
      const newMessages = entries.map((entry, idx) => ({
        role: entry.role === 'model' ? 'assistant' : 'user',
        content: entry.text,
        timestamp: Date.now() - (entries.length - idx) * 1000,
      }));

      const firstUserMsg = entries.find(e => e.role === 'user')?.text || 
                           entries.find(e => e.role === 'model')?.text || 
                           'Live Voice Session';
      const projectName = `Live Voice: ${firstUserMsg.substring(0, 30)}${firstUserMsg.length > 30 ? '...' : ''}`;

      const newProject = {
        id: String(Date.now() + Math.random()),
        name: projectName,
        updatedAt: Date.now(),
        messages: newMessages,
      };

      const updated = [newProject, ...currentProjects];
      localStorage.setItem('lumax_codex_projects', JSON.stringify(updated));
      localStorage.setItem('lumax_active_project_id', newProject.id);
      
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('live-conversation-saved', { detail: newProject }));
    } catch (e) {
      console.warn("Failed to save live conversation locally", e);
    }
  };

  const handleSaveConversation = () => {
    if (!sessionTranscriptions || sessionTranscriptions.length === 0) {
      setStatusMessage("No conversation to save");
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    if (onSaveLiveConversation) {
      onSaveLiveConversation(sessionTranscriptions);
    } else {
      saveToHistoryLocally(sessionTranscriptions);
    }
    
    setIsSaved(true);

    setStatusMessage("Saved to Chat History!");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  useEffect(() => {
    return () => {
      const currentTrans = sessionTranscriptionsRef.current;
      if (currentTrans && currentTrans.length > 0 && !isSavedRef.current) {
        if (onSaveLiveConversation) {
          onSaveLiveConversation(currentTrans);
        } else {
          saveToHistoryLocally(currentTrans);
        }
      }
    };
  }, [onSaveLiveConversation]);

  const initialAISettings: AISetting[] = [
    {
      id: 'gemini',
      name: 'Gemini AI (Free Tier)',
      description: "Google's high-speed models from AI Studio Free Tier.",
      enabled: true,
      icon: 'sparkles',
      versions: [
        { id: MODEL_NAME_DEFAULT, name: 'Gemini 3.1 Flash Live' },
        { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' }
      ],
      selectedVersion: MODEL_NAME_DEFAULT
    },
    { id: 'coding', name: 'Coding Module', description: 'Advanced full-stack development, debugging, and architecture.', enabled: true, icon: 'code' },
    { id: 'education', name: 'Education Module', description: 'Personalized learning, tutoring, and academic research.', enabled: true, icon: 'brain' },
    { id: 'health', name: 'Health Module', description: 'Wellness tracking, medical information, and fitness guidance.', enabled: false, icon: 'zap' },
    { id: 'business', name: 'Business Module', description: 'Market analysis, financial planning, and strategy.', enabled: false, icon: 'message' },
    { id: 'content', name: 'Content Module', description: 'Creative writing, SEO, and social media management.', enabled: false, icon: 'palette' },
    { id: 'automation', name: 'Automation Module', description: 'System-wide task automation and browser testing.', enabled: true, icon: 'mouse' },
    { id: 'security', name: 'Security System', description: 'System monitoring, vulnerability assessment, and protection.', enabled: true, icon: 'cloud' },
  ];

  const [config, setConfig] = useState<LiveConfig>(() => {
    const savedKey = localStorage.getItem('wardenix_api_key');
    const savedDevMode = localStorage.getItem('wardenix_dev_mode') === 'true';
    const savedVoice = localStorage.getItem('wardenix_voice_name') as any;
    return {
      model: MODEL_NAME_DEFAULT,
      voiceName: savedVoice || 'Zephyr',
      isCameraEnabled: false,
      isScreenEnabled: !!ipcRenderer, // Auto-enable screen in Desktop mode
      isMuted: false,
      isMouseMode: true,
      aiSettings: initialAISettings,
      recordingQuality: 'HD',
      instantShareLink: false,
      highlightMouseCursor: true,
      minimalDock: false,
      useProxyServer: false,
      autoStart: false,
      hardwareAcceleration: true,
      frameRate: 60,
      audioBitrate: 256,
      showWatermark: false,
      countdownTimer: 3,
      showWebcamOverlay: true,
      webcamSize: 180,
      language: 'EN',
      isDeveloperMode: savedDevMode,
      isChatWindowOpen: false,
      customApiKey: savedKey || undefined
    };
  });

  useEffect(() => {
    if (config.customApiKey) {
      localStorage.setItem('wardenix_api_key', config.customApiKey);
    } else {
      localStorage.removeItem('wardenix_api_key');
    }
    localStorage.setItem('wardenix_dev_mode', String(config.isDeveloperMode));
    localStorage.setItem('wardenix_voice_name', config.voiceName);
  }, [config.customApiKey, config.isDeveloperMode, config.voiceName]);

  // Auto-restart session when voice changes to apply it immediately
  useEffect(() => {
    if (status === SessionStatus.CONNECTED) {
      const restart = async () => {
        stopSession();
        // Small delay to ensure cleanup
        setTimeout(() => {
          startSession();
        }, 500);
      };
      restart();
    }
  }, [config.voiceName]);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraPreviewOpen, setIsCameraPreviewOpen] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isCameraPreviewOpen && cameraStream && cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [isCameraPreviewOpen, cameraStream]);

  const toggleCameraPreview = async () => {
    if (isCameraPreviewOpen) {
      cameraStream?.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setIsCameraPreviewOpen(false);
      setConfig(p => ({ ...p, isCameraEnabled: false }));
    } else {
      try {
        // Proactive check for camera devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');

        if (!hasCamera) {
          setIsCameraHardwareMissing(true);
          setStatusMessage("No camera hardware found on this PC");
          setTimeout(() => setStatusMessage(null), 3000);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          }
        });

        setCameraStream(stream);
        setIsCameraPreviewOpen(true);
        setIsCameraHardwareMissing(false);
        setConfig(p => ({ ...p, isCameraEnabled: true }));
      } catch (err: any) {
        console.error("Camera access error:", err);
        setIsCameraHardwareMissing(true);
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setStatusMessage("No camera hardware detected");
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatusMessage("Camera permission denied");
        } else {
          setStatusMessage("Camera access failed");
        }
        setTimeout(() => setStatusMessage(null), 3000);
      }
    }
  };
  const startScreenShare = useCallback(async () => {
    try {
      let screenStream: MediaStream | null = null;
      if (ipcRenderer) {
        // Automatic screen selection in Electron
        const sourceId = await ipcRenderer.invoke('automation:get_screen_source');
        if (sourceId) {
          screenStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080
              }
            }
          } as any);
        }
      } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        // Browser fallback with picker
        // Using simpler constraints for better compatibility
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
      }

      if (screenStream && screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
        // Ensure the video plays
        await screenVideoRef.current.play().catch(e => console.error("Screen video play failed:", e));

        const tracks = screenStream.getTracks();
        if (tracks && tracks.length > 0) {
          tracks[0].onended = () => {
            setConfig(p => ({ ...p, isScreenEnabled: false }));
          };
        }
        setConfig(p => ({ ...p, isScreenEnabled: true }));
        setStatusMessage("Screen share active");
        setTimeout(() => setStatusMessage(null), 2000);
        return true;
      } else {
        throw new Error("No stream or video element");
      }
    } catch (e: any) {
      console.warn("Screen share denied or unavailable", e);
      if (e.name === 'NotAllowedError') {
        setStatusMessage("Screen share permission denied");
      } else {
        setStatusMessage("Screen share failed. Try opening in a new tab.");
      }
      setTimeout(() => setStatusMessage(null), 5000);
    }
    return false;
  }, [ipcRenderer]);

  const stopScreenShare = useCallback(() => {
    const screenStream = screenVideoRef.current?.srcObject as MediaStream;
    screenStream?.getTracks().forEach(t => t.stop());
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setConfig(p => ({ ...p, isScreenEnabled: false }));
    setStatusMessage("Screen share stopped");
    setTimeout(() => setStatusMessage(null), 2000);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (config.isScreenEnabled) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [config.isScreenEnabled, startScreenShare, stopScreenShare]);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isModelTalking, setIsModelTalking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCameraHardwareMissing, setIsCameraHardwareMissing] = useState(false);
  const [isAutomationAuthorized, setIsAutomationAuthorized] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ name: string, args: any, id: string } | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>(() => {
    try {
      const saved = localStorage.getItem('wardenix_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn("Failed to parse wardenix_history", e);
    }
    return [];
  });

  useEffect(() => {
    if (Array.isArray(transcriptions)) {
      localStorage.setItem('wardenix_history', JSON.stringify(transcriptions.slice(-50)));
    }
  }, [transcriptions]);

  const isMutedRef = useRef(config.isMuted);
  const isCameraEnabledRef = useRef(config.isCameraEnabled);
  const isScreenEnabledRef = useRef(config.isScreenEnabled);
  const sessionRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => { isMutedRef.current = config.isMuted; }, [config.isMuted]);
  useEffect(() => { isCameraEnabledRef.current = config.isCameraEnabled; }, [config.isCameraEnabled]);
  useEffect(() => { isScreenEnabledRef.current = config.isScreenEnabled; }, [config.isScreenEnabled]);

  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext; analyzer?: AnalyserNode } | null>(null);
  const audioNodesRef = useRef<{ source?: MediaStreamAudioSourceNode; processor?: ScriptProcessorNode; gain?: GainNode } | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.send('resize-window', isSettingsOpen || isAuthOpen);
    }
  }, [isSettingsOpen, isAuthOpen, ipcRenderer]);

  const stopSession = useCallback(() => {
    playSound('stop');
    isStoppingRef.current = true;

    // Autosave live vocal conversation if anything transpired
    const currentTrans = sessionTranscriptionsRef.current;
    if (currentTrans && currentTrans.length > 0 && !isSavedRef.current) {
      if (onSaveLiveConversation) {
        onSaveLiveConversation(currentTrans);
      } else {
        saveToHistoryLocally(currentTrans);
      }
      setIsSaved(true);
    }

    if (ipcRenderer) ipcRenderer.send('resize-window', false);
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (sessionRef.current) {
      try {
        sessionRef.current.close?.();
      } catch (e) { }
    }
    sessionRef.current = null;
    if (audioNodesRef.current?.processor) audioNodesRef.current.processor.disconnect();
    if (audioNodesRef.current?.source) audioNodesRef.current.source.disconnect();
    audioSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
    audioSourcesRef.current.clear();

    // Only stop the videoRef stream if it's not the persistent cameraStream
    const camStream = videoRef.current?.srcObject as MediaStream;
    if (camStream && camStream !== cameraStream) {
      camStream.getTracks().forEach(t => t.stop());
    }

    const screenStream = screenVideoRef.current?.srcObject as MediaStream;
    screenStream?.getTracks().forEach(t => t.stop());
    setStatus(SessionStatus.IDLE);
    setIsUserTalking(false);
    setIsModelTalking(false);
    setConfig(c => ({ ...c, isCameraEnabled: false, isScreenEnabled: false }));
    setIsAutomationAuthorized(false);
    setTimeout(() => { isStoppingRef.current = false; }, 500);
  }, [ipcRenderer, cameraStream, onSaveLiveConversation]);

  const startVisionLoop = useCallback((sessionPromise: Promise<any>) => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = window.setInterval(async () => {
      // Prioritize screen stream for the AI's vision
      const screenStream = screenVideoRef.current?.srcObject as MediaStream;
      const cameraStreamActive = videoRef.current?.srcObject as MediaStream;

      let activeVideo: HTMLVideoElement | null = null;

      if (screenStream && screenStream.active) {
        activeVideo = screenVideoRef.current;
      } else if (cameraStreamActive && cameraStreamActive.active) {
        activeVideo = videoRef.current;
      }

      if (!activeVideo || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      canvasRef.current.width = 640; canvasRef.current.height = 480;
      ctx.drawImage(activeVideo, 0, 0, 640, 480);
      const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
      sessionPromise.then(s => {
        if (sessionRef.current === s && !isStoppingRef.current) {
          s.sendRealtimeInput({ video: { data: base64Data, mimeType: 'image/jpeg' } });
        }
      }).catch(() => { });
    }, 1000 / FRAME_RATE);
  }, []);

  const playSound = (type: 'start' | 'stop') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'start') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }
  };

  const startSession = async () => {
    if (status !== SessionStatus.IDLE) return;
    try {
      setSessionTranscriptions([]);
      setIsSaved(false);
      playSound('start');
      if (ipcRenderer) ipcRenderer.send('resize-window', true);
      setStatus(SessionStatus.CONNECTING);

      const apiKey = config.customApiKey || process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        setStatusMessage("API Key missing");
        setStatus(SessionStatus.IDLE);
        return;
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      if (!audioContextRef.current) {
        audioContextRef.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }),
        };
      }
      const { input: inputCtx, output: outputCtx } = audioContextRef.current;
      await inputCtx.resume(); await outputCtx.resume();

      const analyzer = inputCtx.createAnalyser();
      analyzer.fftSize = 256;
      audioContextRef.current.analyzer = analyzer;

      let screenStream: MediaStream | null = null;
      if (config.isScreenEnabled) {
        const activeStream = screenVideoRef.current?.srcObject as MediaStream;
        if (!activeStream || !activeStream.active) {
          await startScreenShare();
        }
      }

      // Proactive check for microphone
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some(device => device.kind === 'audioinput');

      if (!hasMic) {
        setStatusMessage("No microphone detected");
        setStatus(SessionStatus.IDLE);
        setTimeout(() => setStatusMessage(null), 3000);
        return;
      }

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let camStream: MediaStream | null = null;
      if (config.isCameraEnabled) {
        if (cameraStream) {
          camStream = cameraStream;
        } else {
          try {
            camStream = await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480 }
            });
            setCameraStream(camStream);
          } catch (e) {
            console.error("Failed to get camera for session:", e);
          }
        }
        if (camStream && videoRef.current) {
          videoRef.current.srcObject = camStream;
          videoRef.current.play();
        }
      }
      
      const liveModel = MODEL_NAME_DEFAULT;

      const sessionPromise = ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } } },
          tools: [{ functionDeclarations: automationTools }],
          systemInstruction: "You are Wardenix, the ultimate AI OS Assistant. You have REAL-TIME VISION. You are fast, efficient, and have a bold, helpful personality. You are the master of this PC.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            sessionPromise.then(async (s) => {
              sessionRef.current = s;
            });
            setStatus(SessionStatus.CONNECTED);
            const source = inputCtx.createMediaStreamSource(audioStream);
            const gainNode = inputCtx.createGain();
            // Moderate boost to ensure clear signal
            gainNode.gain.value = 1.2; 
            
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            source.connect(gainNode);
            gainNode.connect(analyzer);
            analyzer.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current || isStoppingRef.current) return;
              
              analyzer.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((p, c) => p + c, 0) / bufferLength;
              
              const isTalking = average > 15; // More sensitive threshold
              setIsUserTalking(isTalking);

              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => {
                if (sessionRef.current === s && !isStoppingRef.current) {
                  s.sendRealtimeInput({ audio: createBlob(inputData) });
                }
              }).catch(() => { });
            };
            audioNodesRef.current = { source, processor: scriptProcessor, gain: gainNode };
            startVisionLoop(sessionPromise);
          },
          onmessage: async (message: any) => {
            // 1. Handle Interruption
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
              audioSourcesRef.current.clear();
              setIsModelTalking(false);
              return;
            }

            // 2. Handle Tool Calls
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls || [];
              for (const fc of functionCalls) {
                let result: any = "ok";
                if (ipcRenderer) {
                   // ipc logic...
                } else {
                  console.log("AI requested tool call (browser mode - no-op):", fc.name, fc.args);
                  setStatusMessage(`⚠️ Automation requires Desktop App`);
                  setTimeout(() => setStatusMessage(null), 4000);
                }

                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: [{ id: fc.id, name: fc.name, response: { result: result } }]
                })).catch(err => console.error("Tool response error:", err));
              }
            }

            // 3. Handle Audio Output & Transcriptions
            const modelTurn = message.serverContent?.modelTurn;
            if (modelTurn?.parts) {
              const audioPart = modelTurn.parts.find(p => p.inlineData?.data);
              if (audioPart?.inlineData?.data) {
                setIsModelTalking(true);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioPart.inlineData.data), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                source.addEventListener('ended', () => {
                  audioSourcesRef.current.delete(source);
                  if (audioSourcesRef.current.size === 0) setIsModelTalking(false);
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
              }

              const text = modelTurn.parts.map(p => p.text).filter(Boolean).join('');
              if (text) {
                setTranscriptions(prev => [...(Array.isArray(prev) ? prev : []).slice(-10), { role: 'model', text }]);
                setSessionTranscriptions(prev => [...prev, { role: 'model', text }]);
                setIsSaved(false);
              }
            }

            const userTurn = message.serverContent?.userTurn;
            if (userTurn?.parts) {
              const text = userTurn.parts.map(p => p.text).filter(Boolean).join('');
              if (text) {
                setTranscriptions(prev => [...(Array.isArray(prev) ? prev : []).slice(-10), { role: 'user', text }]);
                setSessionTranscriptions(prev => [...prev, { role: 'user', text }]);
                setIsSaved(false);
              }
            }
          },
          onerror: (err: any) => {
            if (isStoppingRef.current || err?.message?.includes('aborted')) {
              console.log("Live API connection closed");
            } else {
              console.error("Live API Error:", err);
            }
            stopSession();
          },
          onclose: () => stopSession(),
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Session start error:", err);
      setStatus(SessionStatus.IDLE);
      setStatusMessage("Connection failed");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const isConnected = status === SessionStatus.CONNECTED;
  const isInteracting = isUserTalking || isModelTalking;

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`lumina-capsule ${isConnected ? 'connected' : ''} ${isInteracting ? 'vibrating' : ''}`}
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Confirmation Overlay */}
      <AnimatePresence>
        {pendingAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-[28px]"
          >
            <p className="text-white text-sm font-medium mb-4 text-center">
              Confirm {pendingAction.name.replace('_', ' ')}?
            </p>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  const fc = pendingAction;
                  setPendingAction(null);
                  let result = "ok";
                  if (sessionRef.current) {
                    sessionRef.current.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result: result } }]
                    });
                  }
                  setStatusMessage("Action Confirmed");
                  setTimeout(() => setStatusMessage(null), 2000);
                }}
                className="px-4 py-2 bg-cyan-500 text-black rounded-lg text-xs font-bold hover:bg-cyan-400 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  const fc = pendingAction;
                  setPendingAction(null);
                  if (sessionRef.current) {
                    sessionRef.current.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result: "User cancelled" } }]
                    });
                  }
                  setStatusMessage("Action Cancelled");
                  setTimeout(() => setStatusMessage(null), 2000);
                }}
                className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <video ref={screenVideoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Transcriptions - Subtitle Style removed to avoid duplicate designs and overlapping overlay popups */}

      <div
        className="section-vortex"
        onClick={isConnected ? stopSession : startSession}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className="vortex-glow"></div>
        <Globe
          className={`globe-overlay ${isConnected ? 'text-cyan-400' : 'text-white'}`}
          size={20}
        />
      </div>

      <div className="flex-grow flex items-center justify-center px-4 overflow-hidden">
        <Visualizer
          isActive={isConnected}
          isUserTalking={isUserTalking}
          isModelTalking={isModelTalking}
          isMuted={config.isMuted}
          analyzer={audioContextRef.current?.analyzer}
        />
      </div>

      <div className="section-controls" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          className={`control-icon ${isConnected ? 'icon-active-red' : 'icon-inactive'}`}
          onClick={isConnected ? stopSession : startSession}
          title={isConnected ? "End Session" : "Start Session"}
        >
          <PhoneOff size={16} />
        </button>

        <button
          className={`control-icon ${config.isMuted ? 'icon-inactive slashed' : 'icon-active-cyan'}`}
          onClick={() => setConfig(p => ({ ...p, isMuted: !p.isMuted }))}
          title={config.isMuted ? "Unmute" : "Mute"}
        >
          {config.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          className={`control-icon ${isCameraHardwareMissing ? 'text-amber-500' : isCameraPreviewOpen ? 'icon-active-cyan' : 'icon-inactive'}`}
          onClick={toggleCameraPreview}
          title={isCameraPreviewOpen ? "Close Camera" : "Open Camera"}
        >
          {isCameraPreviewOpen ? <Video size={16} /> : <VideoOff size={16} />}
        </button>

        <button
          className={`control-icon ${config.isScreenEnabled ? 'icon-active-cyan' : 'icon-inactive'}`}
          onClick={toggleScreenShare}
          title={config.isScreenEnabled ? "System Control Active" : "Enable System Control"}
        >
          {isConnected ? <MousePointer2 size={16} className="animate-pulse" /> : <MousePointer2 size={16} />}
        </button>

        {sessionTranscriptions.length > 0 && (
          <button
            className={`control-icon ${isSaved ? 'text-emerald-500' : 'text-slate-200 hover:text-cyan-400'}`}
            onClick={handleSaveConversation}
            title={isSaved ? "Saved to Chat" : "Save Live Conversation"}
          >
            <Save size={16} />
          </button>
        )}

        <button
          className={`control-icon group ${isSettingsOpen ? 'icon-active-cyan' : 'icon-inactive'}`}
          onClick={() => setIsSettingsOpen(true)}
          title="Settings"
        >
          <Settings size={16} className="transition-transform duration-500 group-hover:rotate-90" />
        </button>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        setConfig={setConfig}
        onLoginClick={() => {
          setIsSettingsOpen(false);
          setIsAuthOpen(true);
        }}
        isConnected={isConnected}
        onSendMessage={(text) => {
          if (sessionRef.current) {
            sessionRef.current.sendRealtimeInput({ text });
            setStatusMessage(`Command sent`);
            setTimeout(() => setStatusMessage(null), 2000);
          }
        }}
      />

      <ChatWindow
        isOpen={config.isChatWindowOpen}
        onClose={() => setConfig(prev => ({ ...prev, isChatWindowOpen: false }))}
        isConnected={isConnected}
        onSendMessage={(text) => {
          if (sessionRef.current) {
            sessionRef.current.sendRealtimeInput({ text });
          }
        }}
        onSpeak={(text) => {
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={(u) => setUser(u)}
      />

      <AnimatePresence>
        {isCameraPreviewOpen && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className="circular-video-container"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <video
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              className="circular-video"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .circular-video-container {
          width: ${config.webcamSize}px !important;
          height: ${config.webcamSize}px !important;
        }
      `}</style>

      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-cyan-400 text-[9px] font-bold px-3 py-1 rounded-full border border-cyan-400/30 whitespace-nowrap"
          >
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LiveAssistant;
