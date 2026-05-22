import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  LayoutGrid, 
  Clock, 
  FileText, 
  CircleHelp, 
  Zap, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface ProfileMenuProps {
  user: UserProfile;
  onLogout: () => void;
  onSettingsClick: () => void;
  onFilesClick?: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ user, onLogout, onSettingsClick, onFilesClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { icon: <Settings size={18} />, label: 'Settings', onClick: onSettingsClick },
    { icon: <LayoutGrid size={18} />, label: 'Connectors' },
    { icon: <Clock size={18} />, label: 'Tasks' },
    { icon: <FileText size={18} />, label: 'Files', onClick: () => onFilesClick?.() },
    { icon: <CircleHelp size={18} />, label: 'Help', hasSubmenu: true },
    { icon: <Zap size={18} />, label: 'Upgrade plan' },
    { icon: <LogOut size={18} />, label: 'Sign Out', onClick: onLogout },
  ];

  return (
    <div className="relative w-full px-2 py-4 border-t border-slate-100" ref={menuRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute bottom-full left-2 right-2 mb-3 bg-white rounded-2xl border border-slate-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden z-50 py-1.5"
          >
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors group"
              >
                <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {item.icon}
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                {item.hasSubmenu && <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-100 transition-all text-left group"
      >
        <div className="h-10 w-10 min-w-[40px] rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-lg shadow-sm group-hover:scale-105 transition-transform">
          {user.name.charAt(0) || 'U'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-900 truncate tracking-tight">
            {user.name || 'Manish Kumar'}
          </span>
          <span className="text-[12px] text-slate-500 truncate">
            {user.email || 'jarvis7007t@gmail.com'}
          </span>
        </div>
      </button>
    </div>
  );
};

export default ProfileMenu;
