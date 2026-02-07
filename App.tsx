
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { SessionStatus, LiveConfig } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio-utils';
import Visualizer from './components/Visualizer';

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type;
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const FRAME_RATE = 2; 

const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const isCameraView = queryParams.get('view') === 'camera';

  const syncChannel = useMemo(() => new BroadcastChannel('gemini-sync'), []);

  // --- VIDEO CALL WINDOW UI ---
  if (isCameraView) {
    const camRef = useRef<HTMLVideoElement>(null);
    const [zoom, setZoom] = useState(1);
    const [isMirrored, setIsMirrored] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [isModelTalking, setIsModelTalking] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
      syncChannel.onmessage = (e) => {
        if (e.data.type === 'STATE_UPDATE') {
          setIsMuted(e.data.isMuted);
          setIsConnected(e.data.status === 'CONNECTED');
          setIsModelTalking(e.data.isModelTalking);
        }
      };
      return () => syncChannel.close();
    }, [syncChannel]);

    useEffect(() => {
      let interval: number;
      if (isConnected) {
        interval = window.setInterval(() => setSeconds(s => s + 1), 1000);
      }
      return () => clearInterval(interval);
    }, [isConnected]);

    useEffect(() => {
      async function setupCam() {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideo = devices.some(d => d.kind === 'videoinput');
          if (!hasVideo) throw new Error("NotFoundError");
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (camRef.current) camRef.current.srcObject = stream;
        } catch (e: any) {
          const msg = (e.name === 'NotFoundError' || e.message?.includes('device not found'))
            ? "No physical camera detected."
            : "Camera access denied.";
          setCameraError(msg);
          syncChannel.postMessage({ type: 'COMMAND', action: 'CAM_ERROR', value: msg });
        }
      }
      setupCam();
      return () => {
        const stream = camRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
      };
    }, []);

    const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="relative w-full h-full bg-[#05070a] flex items-center justify-center overflow-hidden font-sans select-none text-white">
        <div className={`absolute inset-0 transition-all duration-700 ${isConnected ? 'scale-100 opacity-100' : 'scale-110 opacity-40 blur-md'}`}>
           {!cameraError ? (
             <video ref={camRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: `scale(${zoom}) ${isMirrored ? 'scaleX(-1)' : 'scaleX(1)'}` }} />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 text-center px-10">
               <svg className="w-16 h-16 mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/><line x1="1" y1="5" x2="23" y2="19"/></svg>
               <h2 className="text-sm font-bold uppercase tracking-widest text-red-500/80 mb-2">Hardware Error</h2>
               <p className="text-xs text-zinc-500">{cameraError}</p>
             </div>
           )}
        </div>
        {isModelTalking && <div className="absolute inset-0 pointer-events-none border-[6px] border-cyan-500/30 animate-pulse" />}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/90 backdrop-blur-2xl px-6 py-4 rounded-full border border-white/10 shadow-2xl">
          <button onClick={() => syncChannel.postMessage({ type: 'COMMAND', action: 'TOGGLE_MUTE', value: !isMuted })} className={`p-4 rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-white'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
          <button onClick={() => { syncChannel.postMessage({ type: 'COMMAND', action: 'STOP' }); window.close(); }} className="p-4 bg-red-600 text-white rounded-full">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rotate-[135deg]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN ASSISTANT LOGIC (HORIZONTAL CAPSULE) ---
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [config, setConfig] = useState<LiveConfig>({
    model: MODEL_NAME,
    voiceName: 'Zephyr',
    isCameraEnabled: false,
    isMuted: false,
    isMouseMode: true
  });
  
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isModelTalking, setIsModelTalking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCameraHardwareMissing, setIsCameraHardwareMissing] = useState(false);
  
  const isMutedRef = useRef(config.isMuted);
  const isCameraEnabledRef = useRef(config.isCameraEnabled);
  const sessionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => { isMutedRef.current = config.isMuted; }, [config.isMuted]);
  useEffect(() => { isCameraEnabledRef.current = config.isCameraEnabled; }, [config.isCameraEnabled]);

  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const audioNodesRef = useRef<{ source?: MediaStreamAudioSourceNode; processor?: ScriptProcessorNode } | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    syncChannel.postMessage({ type: 'STATE_UPDATE', isMuted: config.isMuted, status, isModelTalking });
  }, [config.isMuted, status, isModelTalking, syncChannel]);

  useEffect(() => {
    syncChannel.onmessage = (e) => {
      if (e.data.type === 'COMMAND') {
        if (e.data.action === 'STOP') stopSession();
        if (e.data.action === 'TOGGLE_MUTE') setConfig(c => ({...c, isMuted: e.data.value}));
        if (e.data.action === 'CAM_ERROR') {
            setStatusMessage(e.data.value);
            setTimeout(() => setStatusMessage(null), 3000);
            setConfig(c => ({...c, isCameraEnabled: false}));
        }
      }
    };
  }, [syncChannel]);

  const stopSession = useCallback(() => {
    if (ipcRenderer) ipcRenderer.send('resize-window', false);
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (sessionRef.current) sessionRef.current.close?.();
    sessionRef.current = null;
    if (audioNodesRef.current?.processor) audioNodesRef.current.processor.disconnect();
    if (audioNodesRef.current?.source) audioNodesRef.current.source.disconnect();
    audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    audioSourcesRef.current.clear();
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setStatus(SessionStatus.IDLE);
    setIsUserTalking(false);
    setIsModelTalking(false);
    setConfig(c => ({...c, isCameraEnabled: false}));
    setIsCameraHardwareMissing(false);
  }, [ipcRenderer]);

  const startVisionLoop = useCallback((session: any) => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = window.setInterval(async () => {
      if (!isCameraEnabledRef.current || !videoRef.current || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      canvasRef.current.width = 640; canvasRef.current.height = 480;
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
      if (session) session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
    }, 1000 / FRAME_RATE);
  }, []);

  const startSession = async () => {
    try {
      if (ipcRenderer) ipcRenderer.send('resize-window', true);
      setStatus(SessionStatus.CONNECTING);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (!audioContextRef.current) {
        audioContextRef.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }),
        };
      }
      const { input: inputCtx, output: outputCtx } = audioContextRef.current;
      await inputCtx.resume(); await outputCtx.resume();
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } } },
          systemInstruction: "You are a helpful AI desktop assistant. Always-on-top horizontal pill UI."
        },
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.CONNECTED);
            const source = inputCtx.createMediaStreamSource(audioStream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current) { setIsUserTalking(false); return; }
              const inputData = e.inputBuffer.getChannelData(0);
              const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
              setIsUserTalking(sum / inputData.length > 0.01);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(inputData) })).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            audioNodesRef.current = { source, processor: scriptProcessor };
          },
          onmessage: async (message: LiveServerMessage) => {
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
          onerror: (e) => stopSession(),
          onclose: () => stopSession(),
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { 
      setStatus(SessionStatus.IDLE);
    }
  };

  const toggleCamera = async () => {
    const nextState = !config.isCameraEnabled;
    if (nextState) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!devices.some(d => d.kind === 'videoinput')) throw new Error('NotFoundError');
        setConfig(p => ({...p, isCameraEnabled: true}));
        if (ipcRenderer) ipcRenderer.send('open-video-window');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (status === SessionStatus.CONNECTED && sessionRef.current) startVisionLoop(sessionRef.current);
      } catch (e: any) {
        setIsCameraHardwareMissing(true);
        setStatusMessage("No Camera Found");
        setTimeout(() => { setStatusMessage(null); setIsCameraHardwareMissing(false); }, 3000);
        setConfig(p => ({...p, isCameraEnabled: false}));
      }
    } else {
      setConfig(p => ({...p, isCameraEnabled: false}));
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  };

  const isConnected = status === SessionStatus.CONNECTED;
  const isInteracting = isUserTalking || isModelTalking;

  return (
    <div className={`lumina-capsule ${isConnected ? 'connected' : ''} ${isInteracting ? 'vibrating' : ''}`} style={{ WebkitAppRegion: 'drag' } as any}>
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Vortex Icon (Left) */}
      <div className="section-vortex" onClick={isConnected ? stopSession : startSession} style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="vortex-glow"></div>
        <svg className="globe-overlay" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      </div>

      {/* Visualizer (Center Area) */}
      <div className="flex-grow flex items-center justify-center px-4 overflow-hidden">
        <Visualizer isActive={isConnected} isUserTalking={isUserTalking} isModelTalking={isModelTalking} isMuted={config.isMuted} />
      </div>

      {/* Controls (Right) */}
      <div className="section-controls" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className={`control-icon ${config.isMuted ? 'icon-inactive slashed' : 'icon-active-cyan'}`} onClick={() => setConfig(p => ({...p, isMuted: !p.isMuted}))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </div>
        <div className={`control-icon ${isCameraHardwareMissing ? 'text-amber-500' : config.isCameraEnabled ? 'icon-active-cyan' : 'icon-inactive'}`} onClick={toggleCamera}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        </div>
        <div className={`control-icon ${isConnected ? 'icon-active-red' : 'icon-inactive'}`} onClick={isConnected ? stopSession : startSession}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </div>
      </div>

      {statusMessage && <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-cyan-400 text-[9px] font-bold px-3 py-1 rounded-full border border-cyan-400/30 whitespace-nowrap">{statusMessage}</div>}
    </div>
  );
};

export default App;
