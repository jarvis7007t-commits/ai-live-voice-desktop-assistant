
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

  // State Sync Channel
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
          // Use basic video constraints to maximize compatibility across different monitors/webcams
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
          if (camRef.current) camRef.current.srcObject = stream;
        } catch (e: any) {
          console.error("Video Call Permission Error:", e);
          setCameraError(e.message || "No camera detected");
          syncChannel.postMessage({ type: 'COMMAND', action: 'CAM_ERROR', value: e.message });
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

    const handleEndCall = () => {
      syncChannel.postMessage({ type: 'COMMAND', action: 'STOP' });
      window.close();
    };

    const toggleMute = () => {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      syncChannel.postMessage({ type: 'COMMAND', action: 'TOGGLE_MUTE', value: nextMute });
    };

    return (
      <div className="relative w-full h-full bg-[#05070a] flex items-center justify-center overflow-hidden font-sans select-none text-white">
        {/* Call Surface */}
        <div className={`absolute inset-0 transition-all duration-700 ${isConnected ? 'scale-100 opacity-100' : 'scale-110 opacity-40 blur-md'}`}>
           {!cameraError ? (
             <video 
              ref={camRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transition-transform duration-500 cubic-bezier(0.2, 1, 0.3, 1)"
              style={{ transform: `scale(${zoom}) ${isMirrored ? 'scaleX(-1)' : 'scaleX(1)'}` }}
            />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 px-10 text-center">
               <svg className="w-16 h-16 mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/><line x1="1" y1="5" x2="23" y2="19"/></svg>
               <h2 className="text-sm font-bold uppercase tracking-widest mb-2">Device Link Failure</h2>
               <p className="text-xs text-zinc-600 max-w-xs">{cameraError === 'Requested device not found' ? 'No physical camera was found on this desktop monitor/system.' : cameraError}</p>
             </div>
           )}
        </div>

        {/* Gemini Pulse Overlay */}
        {isModelTalking && (
          <div className="absolute inset-0 pointer-events-none border-[6px] border-cyan-500/30 animate-pulse transition-opacity duration-300">
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(34,211,238,0.2)]"></div>
          </div>
        )}

        {/* Top HUD: Call Info */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-zinc-500'}`}></div>
              <h1 className="text-lg font-semibold tracking-tight">Gemini Live Vision</h1>
            </div>
            <p className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold ml-5">
              {isConnected ? `In Call • ${formatTime(seconds)}` : 'Connecting to AI...'}
            </p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase text-zinc-500 font-bold">Latency</span>
                <span className="text-xs font-mono text-cyan-400">~140ms</span>
             </div>
             <div className="w-[1px] h-6 bg-white/10"></div>
             <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase text-zinc-500 font-bold">Model</span>
                <span className="text-xs font-mono text-white">2.5 FLASH</span>
             </div>
          </div>
        </div>

        {/* Center Loading State */}
        {!isConnected && !cameraError && (
          <div className="z-20 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 border-2 border-cyan-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-t-2 border-cyan-400 rounded-full animate-spin"></div>
              </div>
            </div>
            <span className="text-cyan-400 font-bold tracking-[0.2em] animate-pulse">ESTABLISHING LINK</span>
          </div>
        )}

        {/* Bottom HUD: Pro Controls */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/90 backdrop-blur-2xl px-6 py-4 rounded-[2.5rem] border border-white/10 shadow-2xl transition-transform hover:scale-105 duration-300">
          
          {/* Mute Action */}
          <button 
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' : 'bg-white/5 hover:bg-white/10 text-white'}`}
          >
            {isMuted ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            )}
          </button>

          <div className="w-[1px] h-10 bg-white/10 mx-2"></div>

          {/* PTZ / Zoom Controls */}
          <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/5">
            <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="p-3 hover:text-cyan-400 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
            <span className="text-[10px] font-mono w-10 text-center font-bold text-zinc-400">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(4, zoom + 0.5))} className="p-3 hover:text-cyan-400 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
          </div>

          {/* Mirror Toggle */}
          <button 
            onClick={() => setIsMirrored(!isMirrored)}
            className={`p-4 rounded-full transition-all ${isMirrored ? 'text-cyan-400 bg-cyan-400/10' : 'text-zinc-400 hover:bg-white/5'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M12 3L7 8M12 3l5 5M12 21l-5-5M12 21l5-5"/></svg>
          </button>

          <div className="w-[1px] h-10 bg-white/10 mx-2"></div>

          {/* End Call */}
          <button 
            onClick={handleEndCall}
            className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-600/30 transition-all hover:scale-110 active:scale-95"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
        </div>

        {/* Speaking Visualizer Overlay */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-64 h-12 opacity-60">
           <Visualizer isActive={isConnected} isUserTalking={false} isModelTalking={isModelTalking} isMuted={isMuted} />
        </div>
      </div>
    );
  }

  // --- MAIN ASSISTANT LOGIC (CAPSULE) ---
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

  // Sync state to Video Window
  useEffect(() => {
    syncChannel.postMessage({ 
      type: 'STATE_UPDATE', 
      isMuted: config.isMuted, 
      status,
      isModelTalking 
    });
  }, [config.isMuted, status, isModelTalking, syncChannel]);

  useEffect(() => {
    syncChannel.onmessage = (e) => {
      if (e.data.type === 'COMMAND') {
        if (e.data.action === 'STOP') stopSession();
        if (e.data.action === 'TOGGLE_MUTE') setConfig(c => ({...c, isMuted: e.data.value}));
        if (e.data.action === 'CAM_ERROR') {
            setStatusMessage(`Vision Failure: ${e.data.value}`);
            setTimeout(() => setStatusMessage(null), 5000);
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
  }, [ipcRenderer]);

  const startVisionLoop = useCallback((session: any) => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    
    frameIntervalRef.current = window.setInterval(async () => {
      if (!isCameraEnabledRef.current || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 640; 
      canvas.height = 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      if (session) {
        session.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'image/jpeg' }
        });
      }
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

      if (config.isCameraEnabled) {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = videoStream;
        } catch (vErr) {
            console.warn("Camera failed in startSession:", vErr);
            setConfig(p => ({...p, isCameraEnabled: false}));
        }
      }

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } } },
          systemInstruction: "You are a highly advanced AI desktop assistant. You can hear and see the user in real-time. Be helpful, concise, and friendly."
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
            sessionPromise.then(s => startVisionLoop(s));
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
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              audioSourcesRef.current.clear();
              setIsModelTalking(false);
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error(e); stopSession(); },
          onclose: () => stopSession(),
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { 
      console.error(err);
      setStatusMessage(err.message || "Failed to start session");
      setTimeout(() => setStatusMessage(null), 4000);
      setStatus(SessionStatus.IDLE);
    }
  };

  const toggleCamera = async () => {
    const nextState = !config.isCameraEnabled;
    setConfig(p => ({...p, isCameraEnabled: nextState}));

    if (ipcRenderer) {
      if (nextState) ipcRenderer.send('open-video-window');
    }
    
    if (nextState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (status === SessionStatus.CONNECTED && sessionRef.current) {
          startVisionLoop(sessionRef.current);
        }
      } catch (e: any) {
        console.error("Camera error:", e);
        const errorMsg = e.name === 'NotFoundError' || e.message?.includes('device not found') 
            ? "No Camera Found" 
            : "Camera Permission Denied";
        setStatusMessage(errorMsg);
        setTimeout(() => setStatusMessage(null), 3000);
        setConfig(p => ({...p, isCameraEnabled: false}));
      }
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    }
  };

  const isConnected = status === SessionStatus.CONNECTED;
  const isInteracting = isUserTalking || isModelTalking;

  return (
    <div 
      className={`lumina-capsule ${isConnected ? 'connected' : ''} ${isInteracting ? 'vibrating' : ''}`}
      style={{ WebkitAppRegion: 'drag', width: '320px' } as any}
    >
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating Status Notification */}
      {statusMessage && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap animate-bounce z-50">
            {statusMessage}
        </div>
      )}

      <div 
        className="section-vortex"
        onClick={isConnected ? stopSession : startSession}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className="vortex-glow"></div>
        <svg className="globe-overlay" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      </div>

      <Visualizer 
        isActive={isConnected} 
        isUserTalking={isUserTalking} 
        isModelTalking={isModelTalking} 
        isMuted={config.isMuted} 
      />

      <div className="section-controls" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div 
          className={`control-icon ${isConnected ? 'icon-active-red' : 'icon-inactive'}`}
          onClick={isConnected ? stopSession : startSession}
          title={isConnected ? "End Call" : "Call AI"}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
             <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>

        <div 
          className={`control-icon ${config.isMuted ? 'icon-inactive slashed' : 'icon-active-cyan'}`}
          onClick={() => setConfig(p => ({...p, isMuted: !p.isMuted}))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </div>

        <div 
          className={`control-icon ${config.isCameraEnabled ? 'icon-active-cyan' : 'icon-inactive'}`}
          onClick={toggleCamera}
          title="Enable Vision"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        </div>
      </div>
    </div>
  );
};

export default App;
