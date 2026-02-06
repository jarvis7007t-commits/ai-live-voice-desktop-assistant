
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { SessionStatus, LiveConfig } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio-utils';
import Visualizer from './components/Visualizer';

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type;
const ipcRenderer = isElectron ? (window as any).require('electron').ipcRenderer : null;

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

interface AppProps {
  isFloating?: boolean;
}

const App: React.FC<AppProps> = ({ isFloating = false }) => {
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
  const isMutedRef = useRef(config.isMuted);

  useEffect(() => { isMutedRef.current = config.isMuted; }, [config.isMuted]);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const audioNodesRef = useRef<{ source?: MediaStreamAudioSourceNode; processor?: ScriptProcessorNode } | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  const stopSession = useCallback(() => {
    if (sessionRef.current) sessionRef.current.close?.();
    sessionRef.current = null;
    if (audioNodesRef.current?.processor) audioNodesRef.current.processor.disconnect();
    if (audioNodesRef.current?.source) audioNodesRef.current.source.disconnect();
    audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    audioSourcesRef.current.clear();
    setStatus(SessionStatus.IDLE);
    setIsUserTalking(false);
    setIsModelTalking(false);
  }, []);

  const startSession = async () => {
    try {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } } },
        },
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.CONNECTED);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current) { setIsUserTalking(false); return; }
              const inputData = e.inputBuffer.getChannelData(0);
              const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
              setIsUserTalking(sum / inputData.length > 0.015);
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
            if (message.serverContent?.interrupted) {
              for (const source of audioSourcesRef.current.values()) {
                source.stop();
              }
              audioSourcesRef.current.clear();
              setIsModelTalking(false);
              nextStartTimeRef.current = 0;
            }
          },
          onerror: () => stopSession(),
          onclose: () => stopSession(),
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { 
      setStatus(SessionStatus.IDLE);
    }
  };

  const handleToggleMainWindow = () => {
    if (ipcRenderer) ipcRenderer.send('toggle-main-window');
  };

  const handleCloseApp = () => {
    if (ipcRenderer) ipcRenderer.send('close-app');
  };

  const isConnected = status === SessionStatus.CONNECTED;
  const isInteracting = isUserTalking || isModelTalking;

  return (
    <div 
      className={`lumina-capsule ${isConnected ? 'connected' : ''} ${isInteracting ? 'vibrating' : ''} ${isFloating ? 'floating-instance' : ''}`}
      style={{ WebkitAppRegion: 'drag' } as any}
    >
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
        {isFloating && (
          <div 
            className="control-icon icon-inactive"
            onClick={handleToggleMainWindow}
            title="Toggle Dashboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </div>
        )}

        <div 
          className={`control-icon ${config.isMuted ? 'icon-inactive slashed' : 'icon-active-cyan'}`}
          onClick={() => setConfig(p => ({...p, isMuted: !p.isMuted}))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </div>

        {isFloating && (
          <div 
            className="control-icon icon-inactive hover:text-red-500"
            onClick={handleCloseApp}
            title="Exit Application"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
