import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Loader2, Volume2, User, Sparkles, Copy, Share2, ThumbsUp } from 'lucide-react';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Visualizer from './Visualizer';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string, useThinking: boolean, attachments?: File[]) => Promise<string | null>;
  onSpeak: (text: string) => void;
  onVoiceInput: (text: string) => void;
  isLoading: boolean;
  isSpeaking: boolean;
  sessionTitle: string;
  displayName: string;
  photoURL?: string;
  isLiveMode: boolean;
  onToggleLiveMode: (val: boolean) => void;
  selectedVoice: string;
  onVoiceChange: (voice: any) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  onSpeak,
  onVoiceInput,
  isLoading,
  isSpeaking,
  sessionTitle,
  displayName,
  photoURL,
  isLiveMode,
  onToggleLiveMode,
  selectedVoice,
  onVoiceChange
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await onSendMessage(text, isThinking);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FCFDFF]">
      {/* Header */}
      {messages.length > 0 && (
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{sessionTitle}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <div className="bg-indigo-600/10 px-3 py-1 rounded-full flex items-center gap-2">
                <Visualizer isActive={true} isUserTalking={false} isModelTalking={true} />
                <span className="text-[10px] font-bold text-indigo-600 animate-pulse uppercase tracking-widest font-mono">Speaking</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-500">{displayName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className={cn("flex-1 overflow-y-auto custom-scrollbar", messages.length === 0 ? "flex items-center justify-center" : "p-4 md:p-8 space-y-6")}>
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="relative">
              <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full animate-pulse" />
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt={displayName} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl relative z-10" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-black text-4xl border-4 border-white shadow-2xl relative z-10">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
            
            <div className="space-y-2 relative z-10">
              <h3 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight">Hi, I am {displayName}!</h3>
              <p className="text-sm md:text-base font-bold text-slate-400">Multifaceted Smart Assistant</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-12">
            {messages.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id || i}
                className={cn(
                  "flex flex-col gap-3",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}
              >
                <div className={cn(
                  "text-base leading-relaxed whitespace-pre-wrap max-w-[90%]",
                  msg.role === 'user' 
                    ? "bg-slate-100 text-slate-600 px-6 py-3 rounded-3xl" 
                    : "text-slate-800 font-medium"
                )}>
                  {msg.content}
                </div>
                
                {msg.role === 'model' && (
                  <div className="flex items-center gap-4 px-1">
                    <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors" title="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors" title="Share休">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors" title="Like">
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onSpeak(msg.content)}
                      className={cn(
                        "p-1 transition-all",
                        isSpeaking ? "text-indigo-600" : "text-slate-300 hover:text-indigo-600"
                      )}
                      title="Speak"
                    >
                      <Volume2 className={cn("w-4 h-4", isSpeaking && "animate-pulse")} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="max-w-4xl mx-auto w-full flex gap-2 items-center text-slate-400 p-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium italic">Wardenix is thinking...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={cn("p-4 md:p-8 relative", messages.length === 0 ? "pb-20" : "pt-0")}>
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className={cn(
            "relative w-full max-w-3xl flex items-center bg-white border-[1.5px] rounded-full p-1.5 transition-all group",
            messages.length === 0 
              ? "border-[#D1D5FF] shadow-[0_0_20px_rgba(209,213,255,0.4)]" 
              : "border-slate-200 focus-within:border-[#D1D5FF] focus-within:shadow-[0_0_15px_rgba(209,213,255,0.3)]"
          )}>
            <div className="flex items-center gap-1 pl-4 pr-2">
              <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                <Paperclip className="w-5 h-5 stroke-[1.5]" />
              </button>
            </div>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Search..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-base py-3 h-11 resize-none placeholder:text-slate-300 font-medium overflow-hidden"
              rows={1}
            />
            
            <div className="flex items-center gap-3 pr-2">
              <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors border-r border-slate-100 pr-4">
                <Mic className="w-5 h-5 stroke-[1.5]" />
              </button>
              
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "w-12 h-12 bg-[#0F172A] text-white rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:bg-slate-100 disabled:text-slate-300",
                  isSpeaking && "bg-indigo-600"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSpeaking ? (
                  <div className="flex gap-0.5 items-center">
                    <div className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-3 bg-white rounded-full animate-bounce" />
                  </div>
                ) : (
                  <div className="flex gap-0.5 items-center">
                    <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                    <div className="w-0.5 h-4 bg-white rounded-full" />
                    <div className="w-0.5 h-6 bg-white rounded-full" />
                    <div className="w-0.5 h-4 bg-white rounded-full" />
                    <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                  </div>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] opacity-80">Personal AI Assistant</p>
          </div>
        </div>
      </div>
    </div>
  );
};
