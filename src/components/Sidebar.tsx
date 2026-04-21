import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, LogOut, Menu, X } from 'lucide-react';
import { ChatSession } from '../types';
import { cn } from '../lib/utils';

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
  displayName
}) => {
  return (
    <>
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">W</span>
            </div>
            <h1 className="font-bold text-slate-800">Wardenix</h1>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="m-4 p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-slate-600 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm group"
        >
          <div className="p-1 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
            <Plus className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-sm font-medium">New Chat</span>
        </button>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Chats</p>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all",
                currentSessionId === session.id 
                  ? "bg-indigo-50 text-indigo-700" 
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <MessageSquare className={cn("w-4 h-4", currentSessionId === session.id ? "text-indigo-600" : "text-slate-400")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.title}</p>
              </div>
              <button
                onClick={(e) => onDeleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-400 italic">No chats yet</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400">Pro User</p>
            </div>
          </div>
          
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};
