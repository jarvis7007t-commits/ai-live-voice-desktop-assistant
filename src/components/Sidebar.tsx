import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronsLeft, 
  Bot, 
  HelpCircle, 
  ArrowUpCircle, 
  Files,
  Zap
} from 'lucide-react';
import { ChatSession } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  displayName: string;
  photoURL?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onSignOut,
  onOpenSettings,
  isOpen,
  setIsOpen,
  displayName,
  photoURL
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <>
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0",
          !isOpen && "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between">
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Navigation</h1>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
          {/* Main Actions */}
          <div className="space-y-3">
            <button
              className="w-full flex items-center gap-3 p-4 bg-[#F5F8FF] border border-[#E0E7FF] rounded-2xl text-[#4F46E5] font-bold transition-all hover:bg-[#EEF2FF]"
            >
              <div className="p-1.5 bg-white rounded-lg shadow-sm">
                <Bot className="w-4 h-4 text-[#4F46E5]" />
              </div>
              <span className="text-sm">Agent</span>
            </button>

            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-3 p-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl text-[#64748B] font-bold transition-all hover:bg-slate-50 hover:border-slate-200"
            >
              <Plus className="w-5 h-5 text-slate-300" />
              <span className="text-sm">New Chat</span>
            </button>
          </div>

          {/* Session List */}
          <div className="space-y-1">
            <p className="px-4 py-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">History</p>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  if (window.innerWidth < 768) setIsOpen(false);
                }}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all",
                  currentSessionId === session.id 
                    ? "bg-[#F5F8FF] text-[#4F46E5] font-bold" 
                    : "text-slate-500 hover:bg-slate-50 font-medium"
                )}
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  currentSessionId === session.id ? "bg-[#4F46E5]" : "bg-transparent group-hover:bg-slate-200"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{session.title}</p>
                </div>
                <button
                  onClick={(e) => onDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bridge Status Indicator */}
        <div className="px-6 mb-4">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-2xl border transition-all",
            localStorage.getItem('BRIDGE_URL') ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50/50 border-slate-100"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]",
              localStorage.getItem('BRIDGE_URL') ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PC Master Bridge</p>
              <p className="text-xs font-bold text-slate-600 truncate">
                {localStorage.getItem('BRIDGE_URL')?.replace(/https?:\/\//, '') || "Bridge Offline"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer / Profile */}
        <div className="p-4 relative border-t border-slate-50">
          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-4 right-4 mb-4 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[60]"
              >
                <div className="p-2 space-y-1">
                  <button 
                    onClick={() => { onOpenSettings(); setIsProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span>Help</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-[#4F46E5] bg-[#F5F8FF] rounded-2xl transition-all">
                    <div className="flex items-center gap-3">
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>Upgrade</span>
                    </div>
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all border-b border-slate-50">
                    <Files className="w-4 h-4 text-slate-400" />
                    <span>Files</span>
                  </button>
                  <button 
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-all group"
          >
            <div className="relative">
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-black text-lg border-2 border-white shadow-sm">
                  {displayName.charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            
            <div className="flex-1 text-left min-w-0">
              <p className="text-base font-black text-slate-800 truncate">{displayName}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#4F46E5] transition-colors">View Profile</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};
