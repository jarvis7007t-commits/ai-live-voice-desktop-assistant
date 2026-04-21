import React from 'react';
import { Loader2, Chrome, Sparkles, Monitor, Shield, Zap } from 'lucide-react';

interface AuthOverlayProps {
  onSignIn: () => void;
  isLoading: boolean;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onSignIn, isLoading }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[100] overflow-hidden">
      {/* Background Decors */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg mx-4 z-10">
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 p-8 md:p-12 text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Wardenix OS</h1>
            <p className="text-slate-500 font-medium">Advanced AI-Native PC Automation System</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Monitor, label: 'Full Control', color: 'bg-blue-50 text-blue-600' },
              { icon: Shield, label: 'Secure Bridge', color: 'bg-green-50 text-green-600' },
              { icon: Zap, label: 'Native Speed', color: 'bg-amber-50 text-amber-600' },
              { icon: Sparkles, label: 'Gemini 1.5', color: 'bg-purple-50 text-purple-600' },
            ].map((feature, i) => (
              <div key={i} className={`${feature.color} p-4 rounded-2xl flex flex-col items-center gap-2 border border-black/5`}>
                <feature.icon className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">{feature.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Chrome className="w-5 h-5" />
                <span>Continue with Google</span>
              </>
            )}
          </button>
          
          <p className="text-[10px] text-slate-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.<br/>
            Wardenix requires administrative access for system-level task automation.
          </p>
        </div>
      </div>
    </div>
  );
};
