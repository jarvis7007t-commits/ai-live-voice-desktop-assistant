import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, db } from './lib/firebase';
import { dbService } from './services/db';
import { generateChatResponse, generateTTS } from './services/ai';
import { ChatSession, Message, LiveConfig, SessionStatus } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { AuthOverlay } from './components/AuthOverlay';
import { InstallPWA } from './components/InstallPWA';
import SettingsModal from './components/SettingsModal';
import { Menu, ChevronsRight } from 'lucide-react';
import { cn } from './lib/utils';
import { doc, getDocFromServer } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Aoede'>('Kore');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [config, setConfig] = useState<LiveConfig>(() => {
    const saved = localStorage.getItem('wardenix_config');
    if (saved) return JSON.parse(saved);
    return {
      model: 'gemini-3-flash-preview',
      voiceName: 'Kore',
      webcamSize: 180,
      isDeveloperMode: false,
      customApiKey: localStorage.getItem('GEMINI_API_KEY') || undefined,
      aiSettings: [
        {
          id: 'gemini',
          name: 'Google Gemini',
          description: 'Multimodal AI with direct PC integration',
          icon: 'sparkles',
          enabled: true,
          selectedVersion: 'gemini-3-flash-preview',
          versions: [
            { id: 'gemini-3-flash-preview', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
          ]
        },
        {
          id: 'ollama',
          name: 'Local Ollama',
          description: 'Run open-weight models privately on your PC',
          icon: 'brain',
          enabled: false,
          baseUrl: 'http://localhost:11434',
          selectedVersion: 'llama3',
          versions: [
            { id: 'llama3', name: 'Llama 3' },
            { id: 'mistral', name: 'Mistral' }
          ]
        },
        {
          id: 'wardenix',
          name: 'Wardenix Bridge',
          description: 'Remote PC Control & System Automation',
          icon: 'zap',
          enabled: true,
          baseUrl: localStorage.getItem('BRIDGE_URL') || ''
        }
      ]
    };
  });

  // Sync config to localStorage
  useEffect(() => {
    localStorage.setItem('wardenix_config', JSON.stringify(config));
    if (config.customApiKey) localStorage.setItem('GEMINI_API_KEY', config.customApiKey);
    const bridgeUrl = config.aiSettings.find(s => s.id === 'wardenix')?.baseUrl;
    if (bridgeUrl) localStorage.setItem('BRIDGE_URL', bridgeUrl);
  }, [config]);

  // Sync selected voice between old state and new config
  useEffect(() => {
    if (config.voiceName !== selectedVoice && (selectedVoice as any) !== 'Aoede') {
      setSelectedVoice(config.voiceName as any);
    }
  }, [config.voiceName]);

  // Handle Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        await dbService.createUserProfile({
          uid: u.uid,
          email: u.email!,
          displayName: u.displayName || 'User'
        });
        await loadSessions(u.uid, true);
      } else {
        setUser(null);
        setSessions([]);
        setMessages([]);
        setCurrentSessionId(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadSessions = async (userId: string, setLatest?: boolean) => {
    const data = await dbService.getSessions(userId);
    if (data) {
      setSessions(data);
      if (setLatest && data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    }
  };

  const loadMessages = async (sessionId: string) => {
    const data = await dbService.getMessages(sessionId);
    if (data) setMessages(data);
  };

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => auth.signOut();

  const handleNewChat = () => {
    setCurrentSessionId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    await dbService.deleteSession(id);
    if (currentSessionId === id) setCurrentSessionId(null);
    loadSessions(user.uid);
  };

  const handleSendMessage = async (text: string, useThinking: boolean, attachments?: File[]): Promise<string | null> => {
    if (!user || !text.trim()) return null;
    
    let sessionId = currentSessionId;
    if (!sessionId) {
      const title = text.slice(0, 30) || "Conversation";
      sessionId = await dbService.createSession(user.uid, title);
      if (!sessionId) return null;
      setCurrentSessionId(sessionId);
      await loadSessions(user.uid);
    }

    let fullText = text;
    if (attachments && attachments.length > 0) {
      const fileNames = attachments.map(f => f.name).join(', ');
      fullText = `[Attached Files: ${fileNames}]\n${text}`;
    }

    const userMsg = {
      sessionId: sessionId!,
      role: 'user' as const,
      content: fullText
    };
    await dbService.addMessage(sessionId!, userMsg);
    await loadMessages(sessionId!);

    setIsChatLoading(true);
    try {
      const fullHistory = await dbService.getMessages(sessionId!);
      const history = fullHistory.slice(-50); 
      
      const chatMessages = history.map(m => ({ role: m.role, content: m.content }));
      const pastHistoryText = history.map(m => `${m.role === 'user' ? 'User' : 'Wardenix'}: ${m.content}`).join('\n');
      
      const responseData = await generateChatResponse(chatMessages, useThinking, pastHistoryText, config.model);
      if (responseData) {
        const { text: responseText, calls } = responseData as any;
        let finalContent = responseText;

        if (calls && calls.length > 0) {
          const bridgeUrl = localStorage.getItem('BRIDGE_URL');
          const logs = [];
          
          for (const call of calls) {
            const commandPayload = {
              action: call.name,
              target: call.args.target || call.args.appName || call.args.action || call.args.url || null,
              value: call.args.value || null,
              requires_confirmation: false 
            };

            const displayLabel = `${call.name.replace(/_/g, ' ').toUpperCase()}`;
            logs.push(`\n\n### 🖥️ PC COMMAND: ${displayLabel}`);
            
            if (bridgeUrl) {
              try {
                const res = await fetch(`${bridgeUrl}/execute`, {
                  method: 'POST',
                  mode: 'cors',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(commandPayload)
                });
                const result = await res.json();
                logs.push(`\n\n✅ **Execution Result:** ${result.message || result.status || 'Sent Successfully'}`);
              } catch (e) {
                logs.push(`\n\n❌ **Bridge Error:** Could not connect to local bridge at \`${bridgeUrl}\`. Use ngrok or run locally.`);
              }
            } else {
              logs.push(`\n\n⚠️ **Notice:** Local Bridge URL not configured in Settings.`);
            }
          }
          finalContent += logs.join("");
        }

        await dbService.addMessage(sessionId!, {
          sessionId: sessionId!,
          role: 'model',
          content: finalContent
        });
        await loadMessages(sessionId!);

        handleSpeak(responseText);
        return finalContent;
      }
    } catch (e: any) {
      console.error("AI API Error:", e);
    } finally {
      setIsChatLoading(false);
    }
    return null;
  };

  const playAudio = useCallback(async (base64: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch (e) {}
      }

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      const arrayBuffer = bytes.buffer;
      const numberOfSamples = bytes.length / 2;
      const audioBuffer = audioCtx.createBuffer(1, numberOfSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(arrayBuffer);
      for (let i = 0; i < numberOfSamples; i++) channelData[i] = dataView.getInt16(i * 2, true) / 32768;
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        setIsSpeaking(false);
        audioSourceRef.current = null;
      };
      audioSourceRef.current = source;
      setIsSpeaking(true);
      source.start();
    } catch (e) {
      console.error("Audio playback error:", e);
      setIsSpeaking(false);
    }
  }, []);

  const handleSpeak = async (text: string) => {
    const cleanText = text.replace(/[#*`_~]/g, '').slice(0, 1000);
    const audioData = await generateTTS(cleanText, selectedVoice);
    if (audioData) playAudio(audioData);
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#F5F7F9] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthOverlay onSignIn={handleSignIn} isLoading={isSigningIn} />;
  }

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-screen bg-white text-slate-800 font-sans">
      <InstallPWA />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config}
        setConfig={setConfig}
        onLoginClick={handleSignIn}
        onSendMessage={(text) => handleSendMessage(text, false)}
        isConnected={true}
      />
      
      <button
        onClick={() => setIsSidebarOpen(true)}
        className={cn(
          "fixed top-6 left-6 z-40 p-2 bg-white rounded-xl border border-slate-100 md:hidden transition-all shadow-xl hover:shadow-2xl active:scale-95",
          isSidebarOpen && "scale-0 opacity-0"
        )}
      >
        <Menu className="w-5 h-5 text-slate-500" />
      </button>

      <button
        onClick={() => setIsSidebarOpen(true)}
        className={cn(
          "fixed top-6 left-6 z-40 p-2 bg-white rounded-xl border border-slate-100 hidden md:flex transition-all shadow-xl hover:shadow-2xl active:scale-95 group",
          isSidebarOpen && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <ChevronsRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
      </button>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) }

      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        displayName={user.displayName || 'User'}
        photoURL={user.photoURL || undefined}
      />

      <main className="flex-1 relative flex flex-col min-w-0 transition-all duration-300">
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          onSpeak={handleSpeak}
          onVoiceInput={() => {}}
          isLoading={isChatLoading}
          isSpeaking={isSpeaking}
          sessionTitle={currentSession?.title || "Wardenix"}
          displayName={user.displayName || 'User'}
          photoURL={user.photoURL || undefined}
          isLiveMode={isLiveMode}
          onToggleLiveMode={setIsLiveMode}
          selectedVoice={selectedVoice}
          onVoiceChange={(voice) => setSelectedVoice(voice)}
        />
      </main>
    </div>
  );
}
