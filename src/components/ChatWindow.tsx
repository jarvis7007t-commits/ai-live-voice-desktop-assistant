import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Image as ImageIcon, FileUp, Play, User, Bot, Paperclip } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  attachments?: { name: string; type: string; url: string }[];
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onSpeak: (text: string) => void;
  isConnected: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, onSendMessage, onSpeak, isConnected }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', text: 'Wardenix Terminal Online. How can I assist you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; type: string; url: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && attachments.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    setMessages(prev => [...prev, newMessage]);
    onSendMessage(input);
    setInput('');
    setAttachments([]);

    // Simulate bot response for demo (in real app, this comes from the session)
    if (isConnected) {
      // The actual response will come through the sessionRef in App.tsx
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map((file: File) => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file)
      }));
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      drag
      dragMomentum={false}
      className="fixed right-10 top-20 w-[400px] h-[600px] bg-[#0a0c10] rounded-2xl flex flex-col overflow-hidden z-[60]"
      style={{ WebkitAppRegion: 'no-drag' } as any}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0d1117] cursor-move">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Wardenix Terminal</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.03)_0%,transparent_100%)]"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                {msg.role === 'user' ? <User size={12} className="text-white" /> : <Bot size={12} className="text-blue-400" />}
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{msg.role}</span>
            </div>
            
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600/10 border border-blue-500/20 text-blue-100 rounded-tr-none' 
                : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
            }`}>
              {msg.text}
              
              {msg.attachments && (
                <div className="mt-2 space-y-2">
                  {msg.attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-white/5">
                      {file.type.startsWith('image/') ? (
                        <img src={file.url} alt={file.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <Paperclip size={14} className="text-slate-400" />
                      )}
                      <span className="text-[10px] truncate flex-1">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'bot' && (
              <button 
                onClick={() => onSpeak(msg.text)}
                className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors bg-blue-500/5 px-2 py-1 rounded-full border border-blue-500/10"
              >
                <Play size={10} fill="currentColor" />
                LISTEN AI RESPONSE
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0d1117] border-t border-slate-800">
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar">
            {attachments.map((file, i) => (
              <div key={i} className="relative group shrink-0">
                <div className="w-12 h-12 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden">
                  {file.type.startsWith('image/') ? (
                    <img src={file.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Paperclip size={16} className="text-slate-400" />
                  )}
                </div>
                <button 
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
            className="hidden" 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
          >
            <FileUp size={20} />
          </button>
          
          <input 
            type="text"
            placeholder="Type command or message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all"
          />
          
          <button 
            type="submit"
            disabled={!input.trim() && attachments.length === 0}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:scale-95"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default ChatWindow;
