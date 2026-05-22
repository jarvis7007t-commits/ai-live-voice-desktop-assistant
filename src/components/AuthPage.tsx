import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Chrome,
  ArrowRightLeft
} from 'lucide-react';
import { emailSignIn, emailSignUp, googleSignIn } from '../lib/auth';
import { UserProfile } from '../types';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
  onGuestMode: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onGuestMode }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let user;
      if (isLogin) {
        user = await emailSignIn(email, password);
      } else {
        user = await emailSignUp(email, password, name);
      }
      
      onLogin({
        email: user.email || '',
        name: user.displayName || 'Digital Agent',
        isLoggedIn: true
      });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onLogin({
          email: result.user.email || '',
          name: result.user.displayName || 'Google User',
          isLoggedIn: true
        });
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-[40px] overflow-hidden shadow-2xl p-8 md:p-10">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-400/5">
          <Sparkles size={26} className="text-cyan-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-950 tracking-tight">
          {isLogin ? 'Access Wardenix AI' : 'Create Secure Profile'}
        </h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Unified Security Protocol</p>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-semibold leading-normal"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative group">
              <UserIcon className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-950 transition-colors" size={16} />
              <input 
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 font-semibold text-sm transition-all"
                required={!isLogin}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Identifier</label>
          <div className="relative group">
            <Mail className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-950 transition-colors" size={16} />
            <input 
              type="email"
              placeholder="name@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 font-semibold text-sm transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
          <div className="relative group">
            <Lock className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-950 transition-colors" size={16} />
            <input 
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 font-semibold text-sm transition-all"
              required
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-bold text-sm shadow-xl hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {isLogin ? 'Access Portal' : 'Register Profile'}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <span className="relative px-3 bg-white text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Third Party Sync</span>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-[18px] bg-white border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-50"
        >
          <Chrome size={16} className="text-slate-950" />
          Authorize via Google
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-3 text-center">
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="text-xs text-slate-500 hover:text-slate-950 transition-colors font-semibold"
        >
          {isLogin ? "No account? Build profile here" : "Have profile? Access here"}
        </button>

        <button 
          onClick={onGuestMode}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase tracking-widest flex items-center justify-center gap-1.5"
        >
          <ArrowRightLeft size={10} />
          Launch as Guest Agent
        </button>
      </div>
    </div>
  );
};
