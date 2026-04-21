import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Loader2, Volume2, User, Sparkles } from 'lucide-react';
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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Hello, {displayName}!</h3>
              <p className="text-sm text-slate-400 max-w-xs">I'm Wardenix. How can I help you automate your PC or design projects today?</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id || i}
            className={cn(
              "flex flex-col gap-2 max-w-[85%] md:max-w-[70%]",
              msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
              msg.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
            )}>
              {msg.content}
            </div>
            {msg.role === 'model' && (
              <button 
                onClick={() => onSpeak(msg.content)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <Volume2 className={cn("w-4 h-4", isSpeaking && "text-indigo-600 animate-pulse")} />
              </button>
            )}
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-center text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium italic">Wardenix is thinking...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-8 pt-0">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all overflow-hidden p-2">
            <div className="flex items-end gap-2 px-2">
              <button className="p-3 text-slate-400 hover:text-slate-600 transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 min-h-[44px] max-h-48 resize-none placeholder:text-slate-300"
                rows={1}
              />
              
              <div className="flex items-center gap-2 pb-1.5">
                <button
                  onClick={() => setIsThinking(!isThinking)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    isThinking ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  )}
                  title="Think deeply"
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-lg"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-[11px] font-bold text-indigo-600 hover:opacity-80">
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Input</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 italic">Press Enter to send, Shift + Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
};
