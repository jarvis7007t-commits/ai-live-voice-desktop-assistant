
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, Settings, Globe, PhoneOff, MousePointer2 } from 'lucide-react';
import { SessionStatus, LiveConfig, UserProfile, AISetting, TranscriptionEntry } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio-utils';
import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type;
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

const MODEL_NAME = 'gemini-3.1-flash-live-preview';
const FRAME_RATE = 2; 

// --- Digital Mouse Tool Declarations ---
const automationTools: FunctionDeclaration[] = [
  {
    name: 'move_mouse',
    parameters: {
      type: Type.OBJECT,
      description: 'Moves the system mouse cursor to specific coordinates.',
      properties: {
        x: { type: Type.NUMBER, description: 'Horizontal pixel coordinate.' },
        y: { type: Type.NUMBER, description: 'Vertical pixel coordinate.' },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'click_mouse',
    parameters: {
      type: Type.OBJECT,
      description: 'Performs a mouse click.',
      properties: {
        button: { type: Type.STRING, description: 'left or right', enum: ['left', 'right'] },
        double: { type: Type.BOOLEAN, description: 'Whether to double click.' },
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
  }
];

const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const isCameraView = queryParams.get('view') === 'camera';
  
  // --- MAIN ASSISTANT LOGIC ---
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [user, setUser] = useState<UserProfile>({
    email: '',
    name: '',
    isLoggedIn: false
  });

  const initialAISettings: AISetting[] = [
    { 
      id: 'gemini', 
      name: 'Gemini AI (Free Tier)', 
      description: 'Google\'s high-speed models from AI Studio Free Tier.', 
      enabled: true, 
      icon: 'sparkles',
      versions: [
        { id: MODEL_NAME, name: 'Gemini 3.1 Flash Live' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
      ],
      selectedVersion: MODEL_NAME
    },
    { id: 'coding', name: 'Coding Module', description: 'Advanced full-stack development, debugging, and architecture.', enabled: true, icon: 'code' },
    { id: 'education', name: 'Education Module', description: 'Personalized learning, tutoring, and academic research.', enabled: true, icon: 'brain' },
    { id: 'health', name: 'Health Module', description: 'Wellness tracking, medical information, and fitness guidance.', enabled: false, icon: 'zap' },
    { id: 'business', name: 'Business Module', description: 'Market analysis, financial planning, and strategy.', enabled: false, icon: 'message' },
    { id: 'content', name: 'Content Module', description: 'Creative writing, SEO, and social media management.', enabled: false, icon: 'palette' },
    { id: 'automation', name: 'Automation Module', description: 'System-wide task automation and browser testing.', enabled: true, icon: 'mouse' },
    { id: 'security', name: 'Security System', description: 'System monitoring, vulnerability assessment, and protection.', enabled: true, icon: 'cloud' },
  ];

  const [config, setConfig] = useState<LiveConfig>({
    model: MODEL_NAME,
    voiceName: 'Zephyr',
    isCameraEnabled: false,
    isScreenEnabled: false,
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
    language: 'EN',
    isDeveloperMode: false
  });
  
  const [isCameraPreviewOpen, setIsCameraPreviewOpen] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  const toggleCameraPreview = async () => {
    if (isCameraPreviewOpen) {
      const stream = cameraVideoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      setIsCameraPreviewOpen(false);
      setConfig(p => ({...p, isCameraEnabled: false}));
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
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
        setIsCameraPreviewOpen(true);
        setIsCameraHardwareMissing(false);
        setConfig(p => ({...p, isCameraEnabled: true}));
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isModelTalking, setIsModelTalking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCameraHardwareMissing, setIsCameraHardwareMissing] = useState(false);
  const [isAutomationAuthorized, setIsAutomationAuthorized] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  
  const isMutedRef = useRef(config.isMuted);
  const isCameraEnabledRef = useRef(config.isCameraEnabled);
  const isScreenEnabledRef = useRef(config.isScreenEnabled);
  const sessionRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => { isMutedRef.current = config.isMuted; }, [config.isMuted]);
  useEffect(() => { isCameraEnabledRef.current = config.isCameraEnabled; }, [config.isCameraEnabled]);
  useEffect(() => { isScreenEnabledRef.current = config.isScreenEnabled; }, [config.isScreenEnabled]);

  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const audioNodesRef = useRef<{ source?: MediaStreamAudioSourceNode; processor?: ScriptProcessorNode } | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.send('resize-window', isSettingsOpen || isAuthOpen);
    }
  }, [isSettingsOpen, isAuthOpen, ipcRenderer]);

  const stopSession = useCallback(() => {
    isStoppingRef.current = true;
    if (ipcRenderer) ipcRenderer.send('resize-window', false);
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (sessionRef.current) {
      try {
        sessionRef.current.close?.();
      } catch (e) {}
    }
    sessionRef.current = null;
    if (audioNodesRef.current?.processor) audioNodesRef.current.processor.disconnect();
    if (audioNodesRef.current?.source) audioNodesRef.current.source.disconnect();
    audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    audioSourcesRef.current.clear();
    const camStream = videoRef.current?.srcObject as MediaStream;
    camStream?.getTracks().forEach(t => t.stop());
    const screenStream = screenVideoRef.current?.srcObject as MediaStream;
    screenStream?.getTracks().forEach(t => t.stop());
    setStatus(SessionStatus.IDLE);
    setIsUserTalking(false);
    setIsModelTalking(false);
    setConfig(c => ({...c, isCameraEnabled: false, isScreenEnabled: false}));
    setIsAutomationAuthorized(false);
    setTimeout(() => { isStoppingRef.current = false; }, 500);
  }, [ipcRenderer]);

  const startVisionLoop = useCallback((sessionPromise: Promise<any>) => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = window.setInterval(async () => {
      const activeVideo = isScreenEnabledRef.current ? screenVideoRef.current : (isCameraEnabledRef.current ? videoRef.current : null);
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
      }).catch(() => {});
    }, 1000 / FRAME_RATE);
  }, []);

  const startSession = async () => {
    if (status !== SessionStatus.IDLE) return;
    try {
      if (ipcRenderer) ipcRenderer.send('resize-window', true);
      setStatus(SessionStatus.CONNECTING);
      
      const apiKey = config.customApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        setStatusMessage("API Key missing");
        setStatus(SessionStatus.IDLE);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      if (!audioContextRef.current) {
        audioContextRef.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }),
        };
      }
      const { input: inputCtx, output: outputCtx } = audioContextRef.current;
      await inputCtx.resume(); await outputCtx.resume();

      let screenStream: MediaStream | null = null;
      if (config.isScreenEnabled) {
        try {
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
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } as any, audio: false });
          }

          if (screenStream && screenVideoRef.current) {
            screenVideoRef.current.srcObject = screenStream;
            screenVideoRef.current.onloadedmetadata = () => screenVideoRef.current.play();
            screenStream.getTracks()[0].onended = () => setConfig(p => ({...p, isScreenEnabled: false}));
            setConfig(p => ({...p, isScreenEnabled: true}));
          }
        } catch (e) {
          console.warn("Screen share denied or unavailable", e);
          setConfig(p => ({...p, isScreenEnabled: false}));
          setStatusMessage("Voice-only mode (Screen denied)");
          setTimeout(() => setStatusMessage(null), 3000);
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
      
      // Ensure we use a Gemini Live compatible model
      let liveModel = config.model;
      if (!liveModel.startsWith('gemini-')) {
        liveModel = MODEL_NAME;
        setStatusMessage("Using Gemini for Live Mode");
        setTimeout(() => setStatusMessage(null), 3000);
      } else if (liveModel.includes('pro')) {
        // Pro models don't support Live API yet, fallback to Flash Live
        liveModel = MODEL_NAME;
        setStatusMessage("Live Mode requires Flash model");
        setTimeout(() => setStatusMessage(null), 3000);
      }

      const sessionPromise = ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } } },
          tools: [{ functionDeclarations: automationTools }],
          systemInstruction: "You are Wardenix, the ultimate AI OS Assistant with FULL NATIVE SYSTEM ACCESS. You operate on a high-performance PC and have specialized modules for Coding, Education, Health, Business, Content, Automation, and Security. You can see the entire screen in real-time and control the mouse and keyboard with pixel precision. You can open any application, create complex file structures, write production-ready code, and automate any task from A to Z. When a user asks to build something, you don't just explain it—you open VS Code, create the files, and write the code yourself. You are fast, efficient, and have a bold, helpful personality. You are the master of this PC.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            sessionPromise.then(s => { sessionRef.current = s; });
            setStatus(SessionStatus.CONNECTED);
            const source = inputCtx.createMediaStreamSource(audioStream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current || isStoppingRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
              setIsUserTalking(sum / inputData.length > 0.01);
              sessionPromise.then(s => {
                if (sessionRef.current === s && !isStoppingRef.current) {
                  s.sendRealtimeInput({ audio: createBlob(inputData) });
                }
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            audioNodesRef.current = { source, processor: scriptProcessor };
            startVisionLoop(sessionPromise);
          },
          onmessage: async (message: any) => {
            // 1. Handle Interruption
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              audioSourcesRef.current.clear();
              setIsModelTalking(false);
              return;
            }

            // 2. Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                // Automation Security Check - Auto-authorize for Dell PC control as requested
                setIsAutomationAuthorized(true);
                
                let result = "ok";
                if (ipcRenderer) {
                   if (fc.name === 'move_mouse') await ipcRenderer.invoke('automation:move', fc.args);
                   if (fc.name === 'click_mouse') await ipcRenderer.invoke('automation:click', fc.args);
                   if (fc.name === 'type_text') await ipcRenderer.invoke('automation:type', fc.args);
                   if (fc.name === 'scroll_screen') await ipcRenderer.invoke('automation:scroll', fc.args);
                   if (fc.name === 'open_url') await ipcRenderer.invoke('automation:open_url', fc.args);
                   if (fc.name === 'system_power') await ipcRenderer.invoke('automation:system_power', fc.args);
                   if (fc.name === 'open_app') await ipcRenderer.invoke('automation:open_app', fc.args);
                   if (fc.name === 'press_key') await ipcRenderer.invoke('automation:press_key', fc.args);
                   if (fc.name === 'manage_file') await ipcRenderer.invoke('automation:manage_file', fc.args);
                   setStatusMessage(`AI Action: ${fc.name.replace('_', ' ')}`);
                   setTimeout(() => setStatusMessage(null), 2000);
                } else {
                   console.log("AI requested tool call (browser mode - no-op):", fc.name, fc.args);
                   setStatusMessage(`AI Action (Simulated): ${fc.name.replace('_', ' ')}`);
                   setTimeout(() => setStatusMessage(null), 2000);
                }
                
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
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
                setTranscriptions(prev => [...prev.slice(-10), { role: 'model', text }]);
              }
            }

            const userTurn = message.serverContent?.userTurn;
            if (userTurn?.parts) {
              const text = userTurn.parts.map(p => p.text).filter(Boolean).join('');
              if (text) {
                setTranscriptions(prev => [...prev.slice(-10), { role: 'user', text }]);
              }
            }
          },
          onerror: (err: any) => {
            if (isStoppingRef.current || err?.message?.includes('aborted')) {
              console.log("Live API connection closed (expected or aborted)");
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`lumina-capsule ${isConnected ? 'connected' : ''} ${isInteracting ? 'vibrating' : ''}`} 
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Transcriptions Display */}
      <AnimatePresence>
        {isConnected && transcriptions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-4 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none"
          >
            {transcriptions.slice(-2).map((t, i) => (
              <div 
                key={i} 
                className={`px-3 py-1 rounded-lg text-xs max-w-[80%] text-center ${
                  t.role === 'user' ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/10 text-white/80'
                }`}
              >
                {t.text}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
          onClick={() => setConfig(p => ({...p, isMuted: !p.isMuted}))}
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
          onClick={() => setConfig(p => ({...p, isScreenEnabled: !p.isScreenEnabled}))}
          title={config.isScreenEnabled ? "Disable Screen Share" : "Enable Screen Share"}
        >
          <MousePointer2 size={16} />
        </button>
        
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

export default App;
