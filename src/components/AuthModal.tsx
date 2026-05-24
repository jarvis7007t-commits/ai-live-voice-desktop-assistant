import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Globe, 
  ShieldCheck,
  Chrome,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { emailSignIn, emailSignUp, googleSignIn } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
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
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-10">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-cyan-400 shadow-xl">
                <Globe size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </h2>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Secure Protocol</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
              >
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-100/50 border border-transparent rounded-2xl pl-12 pr-5 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 font-bold text-sm transition-all shadow-inner"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email ID</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                <input 
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-100/50 border border-transparent rounded-2xl pl-12 pr-5 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 font-bold text-sm transition-all shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-100/50 border border-transparent rounded-2xl pl-12 pr-5 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 font-bold text-sm transition-all shadow-inner"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-base shadow-xl hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                   {isLogin ? 'Access Account' : 'Create Profile'}
                   <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <span className="relative px-4 bg-white text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Social Integration</span>
            </div>

            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 px-6 rounded-[22px] bg-white border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all text-sm font-bold text-slate-700 flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
            >
              <Chrome size={20} className="text-slate-900" />
              Sync with Google Account
            </button>
          </div>

          <div className="mt-10 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-400 hover:text-slate-900 transition-colors font-bold tracking-tight"
            >
              {isLogin ? "New to Wardenix? Create an account" : "Existing user? Sign in to system"}
            </button>
          </div>
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-3">
          <ShieldCheck size={16} className="text-slate-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Wardenix Unified Security Hub</span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
