
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, Settings, Globe, PhoneOff, MousePointer2 } from 'lucide-react';
import { SessionStatus, LiveConfig, UserProfile, AISetting, TranscriptionEntry } from './types';
import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import ChatWindow from './components/ChatWindow';

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type;
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

const MODEL_NAME = 'qwen3.5:9b';
const FRAME_RATE = 2; 

// --- MAIN ASSISTANT LOGIC ---
export const App: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [user, setUser] = useState<UserProfile>({
    email: '',
    name: '',
    isLoggedIn: false
  });

  const initialAISettings: AISetting[] = [
    { 
      id: 'ollama', 
      name: 'Wardenix (Local Ollama)', 
      description: 'Local high-performance model running on your hardware.', 
      enabled: true, 
      icon: 'sparkles',
      versions: [
        { id: 'qwen3.5:9b', name: 'Qwen 3.5 9B' },
        { id: 'qwen3.5:2b', name: 'Qwen 3.5 2B' },
        { id: 'llama3', name: 'Llama 3' }
      ],
      selectedVersion: 'qwen3.5:9b'
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
      model: MODEL_NAME,
      voiceName: savedVoice || 'Zephyr',
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
      webcamSize: 180,
      language: 'EN',
      isDeveloperMode: savedDevMode,
      isChatWindowOpen: false,
      useLocalOllama: localStorage.getItem('wardenix_use_ollama') !== 'false',
      customApiKey: savedKey || undefined
    };
  });

  useEffect(() => {
    localStorage.setItem('wardenix_use_ollama', String(config.useLocalOllama));
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
        
        setCameraStream(stream);
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
  const isFirstInteractionRef = useRef(true);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef("");
  const vadAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isListeningActiveRef = useRef(false);
  const volumeThreshold = 0.15; // Increased threshold to avoid noise
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Backend health check with retries
  useEffect(() => {
    let retries = 0;
    const maxRetries = 5;
    
    const checkBackend = async () => {
      try {
        const response = await fetch('/health');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        console.log("[Wardenix] Backend Health:", data);
        setStatusMessage(""); // Clear any previous connection errors
      } catch (error) {
        console.warn(`[Wardenix] Backend check failed (attempt ${retries + 1}/${maxRetries}):`, error);
        if (retries < maxRetries) {
          retries++;
          setTimeout(checkBackend, 2000);
        } else {
          console.error("[Wardenix] Backend unreachable after multiple attempts.");
          setStatusMessage("Backend connection failed");
        }
      }
    };
    
    // Start checking after a short delay
    const timer = setTimeout(checkBackend, 1000);
    return () => clearTimeout(timer);
  }, []);
  const [isCameraHardwareMissing, setIsCameraHardwareMissing] = useState(false);
  const [isAutomationAuthorized, setIsAutomationAuthorized] = useState(false);
  const [pendingAction, setPendingAction] = useState<{name: string, args: any, id: string} | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>(() => {
    const saved = localStorage.getItem('wardenix_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('wardenix_history', JSON.stringify(transcriptions.slice(-50)));
  }, [transcriptions]);
  
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

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

  const stopSession = () => {
    playSound('stop');
    if (ipcRenderer) ipcRenderer.send('resize-window', false);
    
    if ((window as any).recognition) {
      (window as any).recognition.stop();
      (window as any).recognition = null;
    }
    
    window.speechSynthesis.cancel();
    setStatus(SessionStatus.IDLE);
    setIsUserTalking(false);
    setIsModelTalking(false);
  };

  const startVisionLoop = useCallback((sessionPromise: Promise<any>) => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = window.setInterval(async () => {
      // In Desktop mode, we can capture screen even if manual toggle is off
      const isDesktop = !!ipcRenderer;
      const activeVideo = isScreenEnabledRef.current ? screenVideoRef.current : (isCameraEnabledRef.current ? videoRef.current : null);
      
      // If in desktop mode and screen share isn't manually on, we still want to capture frames for the AI
      if (isDesktop && !isScreenEnabledRef.current && !isCameraEnabledRef.current) {
        // We use the screenVideoRef which should be populated by the auto-start logic
        if (screenVideoRef.current && screenVideoRef.current.srcObject) {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && canvasRef.current) {
            canvasRef.current.width = 640; canvasRef.current.height = 480;
            ctx.drawImage(screenVideoRef.current, 0, 0, 640, 480);
            const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.4).split(',')[1];
            sessionPromise.then(s => {
              if (sessionRef.current === s && !isStoppingRef.current) {
                s.sendRealtimeInput({ video: { data: base64Data, mimeType: 'image/jpeg' } });
              }
            }).catch(() => {});
            return;
          }
        }
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
      }).catch(() => {});
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
      playSound('start');
      if (ipcRenderer) ipcRenderer.send('resize-window', true);
      setStatus(SessionStatus.CONNECTING);
      
      // Initialize AudioContext for volume-based VAD
      if (!vadAudioContextRef.current) {
        vadAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = vadAudioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = vadAudioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
      }

      const checkVolume = () => {
        if (!analyserRef.current || statusRef.current !== SessionStatus.CONNECTED) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const volume = average / 255;
        
        // Only process audio if listening is active (after startup delay)
        if (isListeningActiveRef.current) {
          if (volume > volumeThreshold) {
            if (!isUserTalking) setIsUserTalking(true);
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else {
            if (isUserTalking && !silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                setIsUserTalking(false);
                silenceTimerRef.current = null;
              }, 2000); // 2s silence threshold for more stability
            }
          }
        }
        requestAnimationFrame(checkVolume);
      };
      checkVolume();

      // Startup delay: Ignore all input for the first 2.5 seconds
      isListeningActiveRef.current = false;
      setTimeout(() => {
        isListeningActiveRef.current = true;
        console.log("[Wardenix] Listening active after startup delay");
      }, 2500);

      // Initialize Speech Recognition for Voice Input
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setStatusMessage("Speech recognition not supported");
        setStatus(SessionStatus.IDLE);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = config.language === 'HI' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setStatus(SessionStatus.CONNECTED);
        setStatusMessage("Wardenix Online (Ollama)");
        setTimeout(() => setStatusMessage(null), 3000);
      };

      recognition.onresult = async (event: any) => {
        if (!isListeningActiveRef.current) return; // Ignore input during startup delay

        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.trim();
        const confidence = lastResult[0].confidence;
        
        if (lastResult.isFinal) {
          console.log("User said:", transcript, "Confidence:", confidence);
          
          // Stricter VAD & Noise Filtering:
          // 1. Minimum 3 characters for a meaningful command (e.g., "Hi", "Run")
          // 2. Confidence threshold (0.65)
          // 3. Ignore duplicates
          if (transcript.length < 3 || confidence < 0.65 || transcript === lastTranscriptRef.current) {
            console.log("Ignoring noise/short/low-confidence/duplicate transcript");
            return;
          }

          lastTranscriptRef.current = transcript;
          isFirstInteractionRef.current = false; // User has spoken

          // Add user message to history
          const userMsg: TranscriptionEntry = { role: 'user', text: transcript };
          setTranscriptions(prev => [...prev, userMsg]);

          try {
            setIsModelTalking(true);
            const response = await fetch('/ask', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                query: transcript, 
                useLocalOllama: config.useLocalOllama,
                model: config.model,
                apiKey: config.customApiKey,
                isFirstInteraction: isFirstInteractionRef.current,
                history: transcriptions.map(t => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.text }))
              })
            });
            
            if (!response.body) throw new Error("No response body");
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            
            // Add initial empty model message
            setTranscriptions(prev => [...prev, { role: 'model', text: '' }]);

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              fullText += chunk;
              
              // Update the last message in history with the streaming text
              setTranscriptions(prev => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1].text = fullText;
                }
                return next;
              });
            }
            
            // Speak the final response if not empty
            if (fullText.trim()) {
              window.speechSynthesis.cancel(); // Clear any pending speech
              const utterance = new SpeechSynthesisUtterance(fullText);
              utterance.onend = () => setIsModelTalking(false);
              window.speechSynthesis.speak(utterance);
            } else {
              console.warn("Empty response from backend, nothing to speak.");
              setIsModelTalking(false);
            }
            
          } catch (e) {
            console.error("Backend error:", e);
            setStatusMessage("Backend connection failed");
            setIsModelTalking(false);
          }
        } else {
          setIsUserTalking(true);
          // Reset silence timer when user starts talking
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Recognition error:", event.error);
        setStatusMessage(`Mic error: ${event.error}`);
        setStatus(SessionStatus.IDLE);
      };

      recognition.onend = () => {
        if (status === SessionStatus.CONNECTED) {
          try {
            recognition.start(); // Keep listening
          } catch (e) {
            console.error("Recognition restart failed:", e);
          }
        }
      };

      (window as any).recognition = recognition;
      recognition.start();

    } catch (err: any) {
      console.error("Failed to start session:", err);
      setStatusMessage("Connection failed");
      setStatus(SessionStatus.IDLE);
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
                  if (fc.name === 'system_power') result = await ipcRenderer.invoke('automation:system_power', fc.args);
                  if (fc.name === 'manage_file') result = await ipcRenderer.invoke('automation:manage_file', fc.args);
                  
                  if (sessionRef.current) {
                    sessionRef.current.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
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
                      functionResponses: { id: fc.id, name: fc.name, response: { result: "User cancelled the action" } }
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
          title={config.isScreenEnabled ? "System Control Active (Screen Shared)" : "Enable System Control (Screen Share)"}
        >
          {isConnected ? <MousePointer2 size={16} className="animate-pulse" /> : <MousePointer2 size={16} />}
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
        isConnected={isConnected}
        onSendMessage={(text) => {
          // This was for the Gemini Live session, we can repurpose it or leave as is
          setStatusMessage(`Command sent: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
          setTimeout(() => setStatusMessage(null), 2000);
        }}
      />

      <ChatWindow 
        isOpen={config.isChatWindowOpen}
        onClose={() => setConfig(prev => ({ ...prev, isChatWindowOpen: false }))}
        isConnected={isConnected}
        onSendMessage={async (text) => {
          isFirstInteractionRef.current = false;
          // Add user message to history
          const userMsg: TranscriptionEntry = { role: 'user', text };
          setTranscriptions(prev => [...prev, userMsg]);

          try {
            setIsModelTalking(true);
            const response = await fetch('/ask', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                query: text, 
                useLocalOllama: config.useLocalOllama,
                model: config.model,
                apiKey: config.customApiKey,
                history: transcriptions.map(t => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.text }))
              })
            });
            
            if (!response.body) throw new Error("No response body");
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            
            setTranscriptions(prev => [...prev, { role: 'model', text: '' }]);

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              fullText += chunk;
              
              setTranscriptions(prev => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1].text = fullText;
                }
                return next;
              });
            }
            
            const utterance = new SpeechSynthesisUtterance(fullText);
            utterance.onend = () => setIsModelTalking(false);
            window.speechSynthesis.speak(utterance);
            
          } catch (e) {
            console.error("Backend error:", e);
            setStatusMessage("Backend connection failed");
            setIsModelTalking(false);
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

export default App;
