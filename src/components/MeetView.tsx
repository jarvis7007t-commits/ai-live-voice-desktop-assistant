import React, { useState, useEffect } from 'react';
import { 
  X, 
  Video, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  History, 
  Clock, 
  Lock, 
  Globe, 
  ShieldAlert, 
  Loader2, 
  AlertCircle,
  VideoOff,
  User,
  LogOut,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createMeetSpace, getMeetSpace, MeetSpace } from '../services/meetService';
import { googleSignIn, getAccessToken, logout } from '../lib/auth';

interface MeetViewProps {
  onClose: () => void;
}

interface PersistedMeetSpace extends MeetSpace {
  createdAt: string;
}

const MeetView: React.FC<MeetViewProps> = ({ onClose }) => {
  const [createdSpace, setCreatedSpace] = useState<MeetSpace | null>(null);
  const [history, setHistory] = useState<PersistedMeetSpace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Create space config
  const [accessType, setAccessType] = useState<'OPEN' | 'TRUSTED' | 'RESTRICTED'>('OPEN');
  
  // Search space state
  const [searchCode, setSearchCode] = useState('');
  const [searchedSpace, setSearchedSpace] = useState<MeetSpace | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Copied indicator state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Auth requirement
  const [hasToken, setHasToken] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const checkAuth = async () => {
    const token = await getAccessToken();
    setHasToken(!!token);
    if (token) {
      // Decode or retrieve user email if possible, or just set true
      const localFirebaseUser = localStorage.getItem('firebase:authUser:' + Object.keys(localStorage).find(k => k.startsWith('firebase:authUser:'))?.split(':')?.pop());
      if (localFirebaseUser) {
        try {
          const parsed = JSON.parse(localFirebaseUser);
          setUserEmail(parsed.email || 'Workspace User');
        } catch (e) {
          setUserEmail('Workspace User');
        }
      } else {
        setUserEmail('Authenticated Developer');
      }
    } else {
      setUserEmail(null);
    }
    return !!token;
  };

  useEffect(() => {
    checkAuth();
    // Load history from localStorage
    const saved = localStorage.getItem('wadenix_meet_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse meet history', e);
      }
    }
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setHasToken(true);
        setUserEmail(result.user.email || 'Authenticated User');
        setSuccessMessage('Securely authenticated with Google Meet privileges.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setHasToken(false);
      setUserEmail(null);
      setCreatedSpace(null);
      setSearchedSpace(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    }
  };

  const saveToHistory = (space: MeetSpace) => {
    const newEntry: PersistedMeetSpace = {
      ...space,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [newEntry, ...history.filter(h => h.meetingCode !== space.meetingCode)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('wadenix_meet_history', JSON.stringify(updated));
  };

  const handleCreateSpace = async () => {
    setIsLoading(true);
    setError(null);
    setCreatedSpace(null);
    try {
      const authenticated = await checkAuth();
      if (!authenticated) {
        setError('Please sign in to Google to create a Meet space.');
        setIsLoading(false);
        return;
      }

      const space = await createMeetSpace(accessType);
      setCreatedSpace(space);
      saveToHistory(space);
      setSuccessMessage('Meeting space successfully generated!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create Meet space. Make sure Meet API permissions are approved.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchedSpace(null);
    try {
      const authenticated = await checkAuth();
      if (!authenticated) {
        setError('Please sign in to fetch Meet space details.');
        setIsSearching(false);
        return;
      }

      // Extract code if user pasted a full URL
      let code = searchCode.trim();
      if (code.includes('meet.google.com/')) {
        code = code.split('meet.google.com/')[1].split('?')[0];
      }

      const space = await getMeetSpace(code);
      setSearchedSpace(space);
    } catch (err: any) {
      setError(err.message || 'Meeting space not found or permission denied.');
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div id="meet-view-container" className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
            <Video size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-950">Google Meet</h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Instant Collaboration Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasToken && userEmail && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <User size={13} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-600">{userEmail}</span>
              <button 
                onClick={handleLogout}
                title="logout" 
                className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                id="logout-btn"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
          <button 
            id="close-meet-btn"
            onClick={onClose} 
            className="p-2.5 bg-slate-50 hover:bg-slate-250 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-500 hover:text-slate-800 transition-all shadow-sm"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Action area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Authentications Guard */}
            {!hasToken ? (
              <div id="meet-auth-card" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md text-center max-w-lg mx-auto mt-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-650 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-sm">
                  <VideoOff size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-950 tracking-tight mb-2">Connect Google Meet</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  Get high-performance multimodal system control and secure workspace meeting access by logging in via Google.
                </p>

                <button 
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-2xl shadow-lg shadow-slate-950/20 active:scale-98 transition-all disabled:opacity-50"
                  id="google-meet-signin-btn"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[18px] h-[18px]">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in">
                
                {/* Create Meeting Space Card */}
                <div id="meet-create-card" className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                  
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="text-emerald-500" size={18} />
                    <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">Generate Workspace Space</h3>
                  </div>

                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    Formulate a unique secure meeting container to host interactive dialogues, review presentations, or connect system control workflows.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2.5">
                        Access Policy
                      </label>
                      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        {(['OPEN', 'TRUSTED', 'RESTRICTED'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setAccessType(type)}
                            className={`flex-1 py-2 rounded-xl text-xs font-black tracking-tight transition-all ${
                              accessType === type
                                ? 'bg-white text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      id="create-space-submit-btn"
                      onClick={handleCreateSpace}
                      disabled={isLoading}
                      className="h-11 w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-md shadow-slate-950/10 active:scale-99 transition-all disabled:opacity-50 shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} strokeWidth={2.5} />
                      )}
                      Create Meet Space
                    </button>
                  </div>
                </div>

                {/* Toast Success / Notices */}
                <AnimatePresence>
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-2xl text-xs font-bold"
                    >
                      <Check size={16} strokeWidth={3} className="text-emerald-500" />
                      {successMessage}
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-3 px-5 py-3.5 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl text-xs font-bold"
                    >
                      <AlertCircle size={16} className="text-rose-500" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Show newly created space info */}
                {createdSpace && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900 text-white rounded-[28px] p-6 border border-slate-800 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
                      <div>
                        <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Active Space Created</span>
                        <h4 className="text-xl font-black mt-1 leading-none tracking-tight">{createdSpace.meetingCode}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400">
                        {accessType === 'OPEN' ? <Globe size={12} /> : accessType === 'TRUSTED' ? <Lock size={12} /> : <ShieldAlert size={12} />}
                        <span className="text-[10px] font-black uppercase tracking-wider">{accessType} Access</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Meet Url</span>
                        <div className="flex items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-850">
                          <code className="text-xs font-mono font-bold text-slate-300 break-all select-all">{createdSpace.meetingUri}</code>
                          <button
                            onClick={() => copyToClipboard(createdSpace.meetingUri, 'created_url')}
                            className="p-2 hover:bg-slate-850 rounded-xl transition-all text-slate-400 hover:text-white shrink-0"
                            title="Copy Meeting URL"
                          >
                            {copiedCode === 'created_url' ? <Check size={14} className="text-emerald-405" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={() => copyToClipboard(createdSpace.meetingCode, 'created_code')}
                          className="flex-1 h-11 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-650 text-slate-100 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-99"
                        >
                          {copiedCode === 'created_code' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          Copy Meeting Code
                        </button>
                        <a
                          href={createdSpace.meetingUri}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="flex-1 h-11 bg-emerald-505 hover:bg-emerald-600 bg-emerald-500 text-slate-950 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all shadow-md shadow-emerald-500/10 active:scale-99"
                        >
                          <ExternalLink size={14} />
                          Join Meeting Space
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Fetch and query space details */}
                <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <Search className="text-slate-400" size={16} />
                    <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">Query Meeting Configurations</h3>
                  </div>

                  <form onSubmit={handleSearchSpace} className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text"
                      placeholder="Paste meet URL or enter 10-char space code..."
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 transition-all text-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={isSearching || !searchCode.trim()}
                      className="h-10.5 sm:w-28 bg-slate-150 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs active:scale-99 transition-all disabled:opacity-40"
                    >
                      {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} strokeWidth={2.5} />}
                      Lookup
                    </button>
                  </form>

                  {/* Render looked up space configuration */}
                  {searchedSpace && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400">Google Resource Name</span>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">{searchedSpace.name}</p>
                        </div>
                        <div className="px-2.5 py-1 bg-slate-200/60 rounded-full border border-slate-300/40 text-slate-600 text-[9px] font-black uppercase tracking-wider">
                          Active State
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Meeting Code</span>
                          <p className="text-sm font-black text-slate-950 mt-0.5">{searchedSpace.meetingCode}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Access Setting</span>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 uppercase">
                            {searchedSpace.config?.accessType || 'Standard'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1 border-t border-slate-200 pt-3">
                        <button
                          onClick={() => copyToClipboard(searchedSpace.meetingUri, 'searched_url')}
                          className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-250 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                          {copiedCode === 'searched_url' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          Copy Link
                        </button>
                        <a
                          href={searchedSpace.meetingUri}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <ExternalLink size={13} />
                          Go to Space
                        </a>
                      </div>
                    </motion.div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Right History Sidebar Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm h-full flex flex-col min-h-[360px]">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                <History className="text-slate-400" size={16} />
                <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Recent Spaces</h3>
              </div>

              {history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 text-slate-350 border border-slate-200/40">
                    <Clock size={20} />
                  </div>
                  <h4 className="text-xs font-black text-slate-700 tracking-tight">No spaces yet</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[160px] leading-relaxed">
                    Created Google Meet spaces will accumulate here.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[460px]">
                  {history.map((space) => (
                    <div 
                      key={space.meetingCode}
                      className="group p-3 bg-slate-50 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-black text-slate-950 tracking-tight group-hover:text-emerald-600 transition-colors">
                            {space.meetingCode}
                          </p>
                          <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">
                            Created at {space.createdAt}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(space.meetingUri, space.meetingCode)}
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                            title="Copy URL"
                          >
                            {copiedCode === space.meetingCode ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                          <a
                            href={space.meetingUri}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                            title="Join space"
                          >
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('wadenix_meet_history');
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
                  >
                    Clear History
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MeetView;
