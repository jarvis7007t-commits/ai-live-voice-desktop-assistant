
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, Settings, Globe, PhoneOff, MousePointer2 } from 'lucide-react';
import { SessionStatus, LiveConfig } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio-utils';
import Visualizer from './components/Visualizer';

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type;
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
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
  }
];

const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const isCameraView = queryParams.get('view') === 'camera';
  
  // --- MAIN ASSISTANT LOGIC ---
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [config, setConfig] = useState<LiveConfig>({
    model: MODEL_NAME,
    voiceName: 'Zephyr',
    isCameraEnabled: false,
    isScreenEnabled: false,
    isMuted: false,
    isMouseMode: true
  });
  
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isModelTalking, setIsModelTalking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCameraHardwareMissing, setIsCameraHardwareMissing] = useState(false);
  const [isAutomationAuthorized, setIsAutomationAuthorized] = useState(false);
  
  const isMutedRef = useRef(config.isMuted);
  const isCameraEnabledRef = useRef(config.isCameraEnabled);
  const isScreenEnabledRef = useRef(config.isScreenEnabled);
  const sessionRef = useRef<any>(null);
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

  const stopSession = useCallback(() => {
    if (ipcRenderer) ipcRenderer.send('resize-window', false);
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (sessionRef.current) sessionRef.current.close?.();
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
      sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } })).catch(() => {});
    }, 1000 / FRAME_RATE);
  }, []);

  const startSession = async () => {
    try {
      if (ipcRenderer) ipcRenderer.send('resize-window', true);
      setStatus(SessionStatus.CONNECTING);
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
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
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } as any, audio: false });
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = screenStream;
            screenVideoRef.current.onloadedmetadata = () => screenVideoRef.current.play();
          }
          screenStream.getTracks()[0].onended = () => setConfig(p => ({...p, isScreenEnabled: false}));
          setConfig(p => ({...p, isScreenEnabled: true}));
        }
      } catch (e) {
        console.warn("Screen share denied or unavailable", e);
      }

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } } },
          tools: [{ functionDeclarations: automationTools }],
          systemInstruction: "You are a Digital Mouse Agent. You see the screen and can control the mouse/keyboard. Help with tasks by moving, clicking, and typing. Always confirm high-stakes actions."
        },
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.CONNECTED);
            const source = inputCtx.createMediaStreamSource(audioStream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
              setIsUserTalking(sum / inputData.length > 0.01);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(inputData) })).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            audioNodesRef.current = { source, processor: scriptProcessor };
            startVisionLoop(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                // Automation Security Check
                if (!isAutomationAuthorized && !window.confirm(`AI wants to perform system action: ${fc.name}. Allow?`)) {
                   sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "denied by user" } } }));
                   continue;
                }
                setIsAutomationAuthorized(true);
                
                let result = "ok";
                if (ipcRenderer) {
                   if (fc.name === 'move_mouse') await ipcRenderer.invoke('automation:move', fc.args);
                   if (fc.name === 'click_mouse') await ipcRenderer.invoke('automation:click', fc.args);
                   if (fc.name === 'type_text') await ipcRenderer.invoke('automation:type', fc.args);
                   if (fc.name === 'scroll_screen') await ipcRenderer.invoke('automation:scroll', fc.args);
                   setStatusMessage(`AI Action: ${fc.name.replace('_', ' ')}`);
                   setTimeout(() => setStatusMessage(null), 2000);
                } else {
                   console.log("AI requested tool call (browser mode - no-op):", fc.name, fc.args);
                   setStatusMessage(`AI Action (Simulated): ${fc.name.replace('_', ' ')}`);
                   setTimeout(() => setStatusMessage(null), 2000);
                }
                
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
                }));
              }
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setIsModelTalking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
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
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
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
          className={`control-icon ${isCameraHardwareMissing ? 'text-amber-500' : config.isCameraEnabled ? 'icon-active-cyan' : 'icon-inactive'}`} 
          onClick={() => {}}
          title="Camera (Not implemented)"
        >
          {config.isCameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
        
        <button 
          className="control-icon icon-inactive" 
          onClick={() => {}}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

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
