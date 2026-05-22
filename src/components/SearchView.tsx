import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Search as SearchIcon, 
  MessageSquare, 
  Clock, 
  ArrowRight,
  ChevronRight,
  History,
  Calendar,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface SearchViewProps {
  projects: ProjectRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onEditProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

const SearchView: React.FC<SearchViewProps> = ({ 
  projects, 
  isOpen, 
  onClose, 
  onSelectProject,
  onEditProject,
  onDeleteProject
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchResults = useMemo(() => {
    if (!query.trim()) return projects;
    return projects.filter(project => 
      project.name.toLowerCase().includes(query.toLowerCase()) ||
      project.messages.some(m => m.content.toLowerCase().includes(query.toLowerCase()))
    );
  }, [projects, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
      } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
        e.preventDefault();
        onSelectProject(searchResults[selectedIndex].id);
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'E' && searchResults[selectedIndex]) {
        e.preventDefault();
        onEditProject(searchResults[selectedIndex].id);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'D' && searchResults[selectedIndex]) {
        e.preventDefault();
        onDeleteProject(searchResults[selectedIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-[#F4F4F4] rounded-[28px] shadow-2xl overflow-hidden border border-white/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="px-6 py-5 border-b border-slate-200/60 bg-white/40">
          <div className="relative group">
            <input 
              type="text"
              autoFocus
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[16px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
            />
            <SearchIcon className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          </div>
        </div>

        {/* History List */}
        <div className="max-h-[500px] overflow-y-auto py-2 no-scrollbar">
          {searchResults.length > 0 ? (
            searchResults.map((project, idx) => (
              <div
                key={project.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => onSelectProject(project.id)}
                className={`flex items-center gap-4 px-6 py-4 transition-all cursor-pointer ${
                  selectedIndex === idx 
                    ? 'bg-slate-200/50' 
                    : 'hover:bg-slate-100/40'
                }`}
              >
                <div className="flex items-center justify-center text-slate-400 shrink-0">
                  <div className="flex gap-0.5 items-center">
                    <div className="w-0.5 h-3 bg-slate-300 rounded-full" />
                    <div className="w-0.5 h-4 bg-slate-300 rounded-full" />
                    <div className="w-0.5 h-3 bg-slate-300 rounded-full" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-medium text-slate-700 truncate tracking-tight">{project.name}</h3>
                </div>

                <div className="text-[13px] font-medium text-slate-400 whitespace-nowrap">
                  {new Date(project.updatedAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <SearchIcon size={32} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No results found</p>
            </div>
          )}
        </div>

        {/* Footer with Shortcuts */}
        <div className="px-6 py-4 border-t border-slate-200/60 bg-white/40 flex items-center justify-end gap-6">
          <div className="flex items-center gap-1.5 overflow-hidden">
             <span className="text-[11px] font-bold text-slate-400">Go</span>
             <div className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-400 shadow-sm flex items-center">
                <ArrowRight size={10} className="-rotate-90" />
             </div>
          </div>
          
          <div className="flex items-center gap-1.5">
             <span className="text-[11px] font-bold text-slate-400">Edit</span>
             <div className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-400 shadow-sm font-bold flex items-center gap-1">
                Ctrl + <ArrowRight size={10} className="-rotate-90" /> E
             </div>
          </div>

          <div className="flex items-center gap-1.5">
             <span className="text-[11px] font-bold text-slate-400">Delete</span>
             <div className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-400 shadow-sm font-bold flex items-center gap-1">
                Ctrl + <ArrowRight size={10} className="-rotate-90" /> D
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SearchView;
