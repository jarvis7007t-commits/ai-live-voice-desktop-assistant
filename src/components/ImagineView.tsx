import React from 'react';
import { 
  Sparkles, 
  X, 
  Lock, 
  Image as ImageIcon,
  Send,
  Mic,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

interface ImagineViewProps {
  onClose?: () => void;
}

const ImagineView: React.FC<ImagineViewProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/30 backdrop-blur-xl flex items-center justify-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-white/70 backdrop-blur-[40px] rounded-[32px] shadow-2xl overflow-hidden relative border border-white/30"
      >
        {/* Top bar internal */}
        <div className="absolute top-6 right-8 flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors text-slate-600 font-medium text-sm">
            <ImageIcon size={16} className="text-slate-400" />
            Imagine
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-600 font-medium text-sm shadow-sm">
            <Lock size={14} className="text-slate-400" />
            Private
          </button>
        </div>

        <div className="flex flex-col items-center justify-center pt-24 pb-16 px-8">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mb-6 shadow-xl">
             <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-4 h-4 rounded-full border-2 border-white" />
             </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-12 tracking-tight">Grok</h2>

          <div className="w-full max-w-2xl relative">
            <div className="flex items-center gap-4 px-6 py-4 rounded-3xl border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_32px_rgba(0,0,0,0.08)] transition-all">
              <Plus size={20} className="text-slate-400 cursor-pointer" />
              <input 
                type="text" 
                placeholder="How can I help you today?"
                className="flex-1 bg-transparent border-none outline-none text-lg font-medium text-slate-700 placeholder:text-slate-300"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Fast <ChevronDown size={14} />
                </div>
                <Mic size={20} className="text-slate-400 cursor-pointer" />
                <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-[1.5px] h-3 bg-white/60 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
                <button className="p-2 bg-slate-50 rounded-full text-slate-300">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom banner internal */}
        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="flex -space-x-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-6 h-6 rounded-lg border-2 border-white bg-slate-200" />
                ))}
             </div>
             <p className="text-[13px] font-semibold text-slate-600">
               Connectors are now available. 
               <span className="text-[12px] font-medium text-slate-400 ml-2">Connectors allow Grok to interact with apps directly in conversations.</span>
             </p>
          </div>
          <div className="flex items-center gap-4">
             <button className="text-[13px] font-bold text-slate-400 hover:text-slate-600 transition-colors">Dismiss</button>
             <button className="px-5 py-2 rounded-full bg-black text-white text-[13px] font-bold shadow-lg hover:scale-105 transition-transform active:scale-95">Connect</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ChevronDown = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

export default ImagineView;
