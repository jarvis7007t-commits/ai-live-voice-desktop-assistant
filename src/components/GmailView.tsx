import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Mail, 
  Send, 
  RefreshCcw, 
  User, 
  ChevronRight,
  MoreVertical,
  Plus,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listEmails, sendEmail, GmailMessage } from '../services/gmailService';
import { googleSignIn, getAccessToken } from '../lib/auth';

interface GmailViewProps {
  onClose: () => void;
}

const GmailView: React.FC<GmailViewProps> = ({ onClose }) => {
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  
  // Compose state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchEmails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        // Try to sign in or just show auth button
        setIsLoading(false);
        return;
      }
      const data = await listEmails(20);
      setEmails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch emails');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        fetchEmails();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) return;
    
    setIsSending(true);
    try {
      await sendEmail(to, subject, body);
      setIsComposeOpen(false);
      setTo('');
      setSubject('');
      setBody('');
      // Refresh list
      fetchEmails();
    } catch (err: any) {
      alert(err.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-[32px] text-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/40">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm">
            <Mail size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Gmail</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Integrated Inbox</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchEmails}
            disabled={isLoading}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 disabled:opacity-50"
          >
            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            Compose
          </button>
          <button onClick={onClose} className="ml-2 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
             <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Inbox List */}
        <div className={`flex-1 flex flex-col min-w-0 ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search emails..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100/50 border border-transparent rounded-2xl text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <Loader2 size={40} className="animate-spin opacity-20" />
                <p className="text-sm font-medium animate-pulse">Syncing with Google...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 max-w-xs mx-auto text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                  <AlertCircle size={32} />
                </div>
                <p className="text-sm font-bold">{error}</p>
                <button 
                  onClick={handleSignIn}
                  className="mt-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-md hover:bg-slate-700 transition-all"
                >
                  Sign in with Google
                </button>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Mail size={48} className="mb-4 opacity-10" />
                <p className="text-sm font-medium">Your inbox is empty</p>
                <p className="text-[11px] uppercase tracking-widest mt-1 opacity-50 font-bold">Inbox Zero Achieved</p>
              </div>
            ) : (
              emails.map((email) => (
                <div 
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedEmail?.id === email.id
                      ? 'bg-white border-slate-900 shadow-lg scale-[1.02] z-10' 
                      : 'bg-white/50 border-white/40 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 font-bold text-sm">
                    {email.from?.[0].toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">{email.from}</h3>
                      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                        {email.date ? new Date(email.date).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <h4 className="text-[13px] font-bold text-slate-700 truncate mb-1">{email.subject}</h4>
                    <p className="text-[12px] font-medium text-slate-400 truncate-2-lines line-clamp-2 leading-relaxed">
                      {email.snippet}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Email Detail */}
        {selectedEmail && (
          <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-xl border-l border-white/50">
            <div className="p-4 border-b border-white/50 flex items-center justify-between">
              <button 
                onClick={() => setSelectedEmail(null)}
                className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                    {selectedEmail.from?.[0].toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedEmail.from}</h2>
                    <p className="text-xs font-medium text-slate-400">{selectedEmail.date}</p>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
                  {selectedEmail.subject}
                </h1>
                <div className="text-[15px] leading-relaxed text-slate-700 font-medium">
                  {selectedEmail.body ? (
                    selectedEmail.body.trim().startsWith('<') || selectedEmail.body.includes('</') || selectedEmail.body.includes('<div') ? (
                      <iframe
                        title="Email Body"
                        srcDoc={selectedEmail.body}
                        className="w-full min-h-[450px] border border-slate-100 rounded-2xl bg-white shadow-inner"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="bg-white/80 p-6 rounded-2xl border border-slate-100 whitespace-pre-wrap text-slate-800 leading-relaxed font-normal">
                        {selectedEmail.body}
                      </div>
                    )
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {selectedEmail.snippet}...
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 bg-white/80 border-t border-white/50">
              <div className="max-w-2xl mx-auto flex items-center gap-4">
                <button 
                  onClick={() => {
                    setIsComposeOpen(true);
                    setTo(selectedEmail.from || '');
                    setSubject(`Re: ${selectedEmail.subject}`);
                  }}
                  className="flex-1 py-3 px-6 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                >
                  Reply
                </button>
                <button className="px-6 py-3 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">
                  Forward
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compose Overlay */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-950/30 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-white/90 backdrop-blur-[40px] rounded-[32px] shadow-2xl overflow-hidden relative border border-white/30"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-50">
                <h2 className="text-xl font-bold tracking-tight">New Message</h2>
                <button onClick={() => setIsComposeOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSend} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recipient</label>
                  <input 
                    type="email" 
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full px-5 py-3 rounded-2xl bg-slate-100/50 border border-transparent focus:bg-white focus:border-slate-200 outline-none font-bold text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What's this about?"
                    required
                    className="w-full px-5 py-3 rounded-2xl bg-slate-100/50 border border-transparent focus:bg-white focus:border-slate-200 outline-none font-bold text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message</label>
                  <textarea 
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    placeholder="Write your email here..."
                    required
                    className="w-full px-5 py-3 rounded-2xl bg-slate-100/50 border border-transparent focus:bg-white focus:border-slate-200 outline-none font-medium text-sm transition-all resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-6 py-3 font-bold text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSending}
                    className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Send Message
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GmailView;
