import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Pin, 
  Archive, 
  Trash2, 
  Plus, 
  Loader2, 
  Check, 
  Palette, 
  Tag, 
  MoreVertical, 
  CheckSquare, 
  Square,
  FileText,
  Clock,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  RefreshCw,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchKeepNotes, createKeepNote, updateKeepNote, deleteKeepNote, KeepNote } from '../services/keepService';
import { googleSignIn, logout, auth } from '../lib/auth';
import { onAuthStateChanged } from 'firebase/auth';

interface KeepViewProps {
  onClose: () => void;
}

const COLOR_TEMPLATES = [
  { name: 'white', bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-905', hex: '#FFFFFF' },
  { name: 'amber', bg: 'bg-amber-100/55', border: 'border-amber-300/60', text: 'text-amber-955', hex: '#FEF3C7' },
  { name: 'emerald', bg: 'bg-emerald-100/55', border: 'border-emerald-300/60', text: 'text-emerald-955', hex: '#D1FAE5' },
  { name: 'rose', bg: 'bg-rose-100/55', border: 'border-rose-300/60', text: 'text-rose-955', hex: '#FFE4E6' },
  { name: 'sky', bg: 'bg-sky-100/55', border: 'border-sky-300/60', text: 'text-sky-955', hex: '#E0F2FE' },
  { name: 'violet', bg: 'bg-violet-100/55', border: 'border-violet-300/60', text: 'text-violet-955', hex: '#F5F3FF' },
  { name: 'slate', bg: 'bg-slate-100/77', border: 'border-slate-300/70', text: 'text-slate-955', hex: '#F1F5F9' },
  { name: 'orange', bg: 'bg-orange-100/55', border: 'border-orange-300/60', text: 'text-orange-955', hex: '#FFEDD5' },
];

const KeepView: React.FC<KeepViewProps> = ({ onClose }) => {
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [allLabels, setAllLabels] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // New Note Builder Form State
  const [isExpandingNewNote, setIsExpandingNewNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState('white');
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checklistItems, setChecklistItems] = useState<Array<{ text: string; done: boolean }>>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [newLabelsString, setNewLabelsString] = useState('');

  // Active Editor Modal State (Click to edit existing note)
  const [editingNote, setEditingNote] = useState<KeepNote | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('white');
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [editLabelsString, setEditLabelsString] = useState('');

  // Dropdowns for quick color selector in creator
  const [showColorPickerCreator, setShowColorPickerCreator] = useState(false);

  useEffect(() => {
    // Listen to Auth State
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        loadNotes(firebaseUser.uid);
      } else {
        setNotes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadNotes = async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const records = await fetchKeepNotes(uid);
      setNotes(records);

      // Extract unique labels
      const labelsSet = new Set<string>();
      records.forEach(n => {
        if (n.labels && Array.isArray(n.labels)) {
          n.labels.forEach((lbl: string) => {
            if (lbl.trim()) labelsSet.add(lbl.trim());
          });
        }
      });
      setAllLabels(Array.from(labelsSet));
    } catch (err: any) {
      setError('Unable to load notes from Firestore database.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        loadNotes(result.user.uid);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNotes([]);
  };

  // Create keep note
  const handleCreateNoteSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    if (!newTitle.trim() && !newContent.trim() && checklistItems.length === 0) {
      setIsExpandingNewNote(false);
      return;
    }

    try {
      let finalContentString = newContent;
      if (isChecklistMode) {
        finalContentString = JSON.stringify(checklistItems);
      }

      // Read labels
      const parsedLabels = newLabelsString
        .split(',')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      const notePayload = {
        userId: user.uid,
        title: newTitle.trim() || 'Untitled Note',
        content: finalContentString,
        color: newColor,
        isPinned: false,
        isArchived: false,
        labels: parsedLabels
      };

      await createKeepNote(notePayload);
      setSuccess('Note saved to Firestore');

      // Clear Form
      setNewTitle('');
      setNewContent('');
      setNewColor('white');
      setIsChecklistMode(false);
      setChecklistItems([]);
      setNewTodoText('');
      setNewLabelsString('');
      setIsExpandingNewNote(false);

      // Reload
      loadNotes(user.uid);
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      setError('Failed to write note card to database.');
    }
  };

  // Toggle quick checkbox items inside the Keep Card list
  const handleToggleChecklistItem = async (note: KeepNote, index: number) => {
    try {
      const parsed = JSON.parse(note.content);
      parsed[index].done = !parsed[index].done;
      
      const updatedContent = JSON.stringify(parsed);
      
      // Update state locally first for snappy UI
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
      
      // Sync with Firestore
      await updateKeepNote(note.id, { content: updatedContent });
    } catch (e) {
      console.error('Failed to toggle checklist', e);
    }
  };

  // Pin note toggle
  const handleTogglePin = async (note: KeepNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const pinState = !note.isPinned;
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isPinned: pinState } : n));
      await updateKeepNote(note.id, { isPinned: pinState });
    } catch (err) {
      setError('Failed to update pin level.');
    }
  };

  // Archive note toggle
  const handleToggleArchive = async (note: KeepNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const archiveState = !note.isArchived;
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isArchived: archiveState, isPinned: false } : n));
      await updateKeepNote(note.id, { isArchived: archiveState, isPinned: false });
      setSuccess(archiveState ? 'Note archived' : 'Note unarchived');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to update archive list.');
    }
  };

  // Delete note
  const handleDeleteNoteCard = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to permantly delete this note? This cannot be undone.');
    if (!confirmed) return;

    try {
      setNotes(prev => prev.filter(n => n.id !== noteId));
      await deleteKeepNote(noteId);
      setSuccess('Note deleted.');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to delete note card.');
    }
  };

  // Add item to checklist compiler
  const handleAddTodoItem = () => {
    if (!newTodoText.trim()) return;
    setChecklistItems(prev => [...prev, { text: newTodoText.trim(), done: false }]);
    setNewTodoText('');
  };

  // Remove checklist item from compiler
  const handleRemoveTodoItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  // Click handler to open editing note
  const handleOpenEdit = (note: KeepNote) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditColor(note.color || 'white');
    setEditLabels(note.labels || []);
    setEditLabelsString((note.labels || []).join(', '));

    // Detect if content is JSON checklist
    try {
      const parsed = JSON.parse(note.content);
      if (Array.isArray(parsed)) {
        setEditContent(note.content); // Store plain JSON for checklist toggles inside card
      } else {
        setEditContent(note.content);
      }
    } catch (e) {
      setEditContent(note.content);
    }
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !user) return;

    try {
      const parsedLabels = editLabelsString
        .split(',')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      const updatesPaylog = {
        title: editTitle.trim() || 'Untitled Note',
        content: editContent,
        color: editColor,
        labels: parsedLabels
      };

      await updateKeepNote(editingNote.id, updatesPaylog);
      setSuccess('Note updated successfully');
      setEditingNote(null);
      loadNotes(user.uid);
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      setError('Failed to submit updates.');
    }
  };

  // Filters logic
  const filteredNotes = notes.filter(note => {
    // Label filtering
    if (activeLabel && (!note.labels || !note.labels.includes(activeLabel))) {
      return false;
    }
    // Archive filtering
    if (showArchived && !note.isArchived) return false;
    if (!showArchived && note.isArchived) return false;

    // Search query matches title or content
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(query);
      
      let matchContent = false;
      try {
        const parsed = JSON.parse(note.content);
        if (Array.isArray(parsed)) {
          matchContent = parsed.some((item: any) => item.text.toLowerCase().includes(query));
        } else {
          matchContent = note.content.toLowerCase().includes(query);
        }
      } catch (e) {
        matchContent = note.content.toLowerCase().includes(query);
      }

      return matchTitle || matchContent;
    }

    return true;
  });

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const ordinaryNotes = filteredNotes.filter(n => !n.isPinned);

  const getTemplate = (colorName: string) => {
    return COLOR_TEMPLATES.find(c => c.name === colorName) || COLOR_TEMPLATES[0];
  };

  return (
    <div id="keep-notes-container" className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans select-none">
      {/* Search Header Banner */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-250/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-amber-45 bg-amber-100 border border-amber-200/50 rounded-xl flex items-center justify-center text-amber-600 shadow-xs">
            <CheckSquare size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-950">Secure Keep</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Firebase Synced Notes</p>
          </div>
        </div>

        {/* Searching bar in header */}
        <div className="hidden md:flex relative w-80">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search notes titles, content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-205 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <button 
              onClick={() => loadNotes(user.uid)}
              title="Sync manually"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200"
            >
              <RefreshCw size={13} />
            </button>
          )}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200 text-xs font-bold text-slate-600">
              <User size={12} className="text-slate-450" />
              <span>{user.email || 'Keep Owner'}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 ml-1">
                <LogOut size={12} />
              </button>
            </div>
          )}
          <button 
            onClick={onClose} 
            className="p-2 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-all"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex min-h-0">
        
        {/* Left Drawer Side Navigation */}
        <div className="w-56 bg-white border-r border-slate-200 p-4 shrink-0 flex flex-col justify-between hidden sm:flex">
          <div className="space-y-6">
            
            {/* Folder selections */}
            <div className="space-y-1">
              <button
                onClick={() => { setShowArchived(false); setActiveLabel(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  !showArchived && !activeLabel
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-905'
                }`}
              >
                <FileText size={15} />
                Notes
              </button>
              <button
                onClick={() => { setShowArchived(true); setActiveLabel(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  showArchived && !activeLabel
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-905'
                }`}
              >
                <Archive size={15} />
                Archive Folder
              </button>
            </div>

            {/* Labels section */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block px-3">Filter Labels</span>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {allLabels.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic block px-3">No labels compiled yet.</span>
                ) : (
                  allLabels.map(label => (
                    <button
                      key={label}
                      onClick={() => setActiveLabel(activeLabel === label ? null : label)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                        activeLabel === label
                          ? 'bg-amber-100/50 text-amber-850 hover:bg-amber-100/60'
                          : 'text-slate-550 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <Tag size={12} className="text-amber-500 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="flex gap-1 items-center">
              <Sparkles size={11} className="text-amber-500" />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Storage Secured</span>
            </div>
            <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">
              Google Keep integration restricts note access to database authors.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-100 p-6 overflow-y-auto min-w-0 flex flex-col items-center">
          
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-xs font-bold"
              >
                <Check size={14} strokeWidth={3} className="text-emerald-500" />
                {success}
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl text-xs font-bold"
              >
                <AlertCircle size={14} className="text-rose-500" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {!user ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md text-center max-w-sm mt-12">
              <div className="w-14 h-14 bg-amber-50 border border-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
                <CheckSquare size={26} />
              </div>
              <h2 className="text-base font-black text-slate-950 tracking-tight mb-1.5">Secure Google Keep Note Sync</h2>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                Please verify your Google identity to save, retrieve, color coordinate, and sort your notes.
              </p>

              <button 
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="w-full h-11 flex items-center justify-center gap-2.5 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 text-xs"
              >
                {isLoggingIn ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-8">
              
              {/* Note creator component */}
              <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-202 shadow-md overflow-hidden transition-all duration-300">
                  {!isExpandingNewNote ? (
                    <div 
                      onClick={() => setIsExpandingNewNote(true)}
                      className="px-5 py-3.5 flex items-center justify-between text-slate-400 cursor-text select-none"
                    >
                      <span className="text-xs font-semibold">Take a new Keep note or checklist...</span>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          title="New Checklist"
                          onClick={(e) => { e.stopPropagation(); setIsChecklistMode(true); setIsExpandingNewNote(true); }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                        >
                          <CheckSquare size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateNoteSubmit} className="p-4 space-y-4">
                      {/* Title input */}
                      <input 
                        type="text" 
                        placeholder="Title heading"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-transparent border-none text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-0 text-xs"
                      />

                      {/* Content block: depends on standard or checklist mode */}
                      {!isChecklistMode ? (
                        <textarea
                          placeholder="Note content..."
                          rows={3}
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          className="w-full bg-transparent border-none text-slate-700 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-0 resize-y"
                        />
                      ) : (
                        <div className="space-y-2">
                          {/* List items */}
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {checklistItems.map((item, index) => (
                              <div key={index} className="flex items-center gap-2 group p-1 bg-slate-50 rounded-lg border border-slate-150">
                                <Square size={13} className="text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-700 flex-1 truncate">{item.text}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTodoItem(index)}
                                  className="p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Todo input builder bar */}
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Add checklist line item"
                              value={newTodoText}
                              onChange={(e) => setNewTodoText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTodoItem(); }}}
                              className="flex-1 bg-slate-50 border border-slate-200 focus:border-slate-350 pr-8 pl-3 py-1 text-[11px] font-semibold rounded-lg text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={handleAddTodoItem}
                              className="px-2.5 py-1 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Labels tagging line */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <Tag size={12} className="text-slate-400 shrink-0" />
                        <input 
                          type="text" 
                          placeholder="Tags / Labels (comma separated list, e.g. Ideas, Q3)"
                          value={newLabelsString}
                          onChange={(e) => setNewLabelsString(e.target.value)}
                          className="flex-1 bg-transparent border-none text-[10px] text-slate-500 placeholder:text-slate-400 focus:outline-none font-semibold focus:ring-0"
                        />
                      </div>

                      {/* Toolbars */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 relative">
                          
                          {/* Color template choosing button */}
                          <button
                            type="button"
                            title="Card palette"
                            onClick={() => setShowColorPickerCreator(!showColorPickerCreator)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-800 transition-colors"
                          >
                            <Palette size={13} />
                          </button>

                          {showColorPickerCreator && (
                            <div className="absolute top-[32px] left-0 z-55 bg-white border border-slate-200 p-2 rounded-xl shadow-xl flex gap-1.5">
                              {COLOR_TEMPLATES.map(col => (
                                <button
                                  key={col.name}
                                  type="button"
                                  onClick={() => { setNewColor(col.name); setShowColorPickerCreator(false); }}
                                  className={`w-5 h-5 rounded-full border ${col.bg} ${col.border} flex items-center justify-center transition-transform hover:scale-115`}
                                >
                                  {newColor === col.name && <Check size={10} className="text-slate-805" />}
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => { setIsChecklistMode(!isChecklistMode); setChecklistItems([]); }}
                            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${isChecklistMode ? 'bg-amber-100 text-amber-700' : 'text-slate-450 hover:text-slate-700'}`}
                          >
                            <CheckSquare size={13} />
                            <span className="text-[10px] font-semibold">Checklist</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setIsExpandingNewNote(false); setChecklistItems([]); }}
                            className="px-3.5 py-1.5 hover:bg-slate-100 text-slate-500 text-[11px] font-bold rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateNoteSubmit()}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black rounded-lg transition-all shadow-sm"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Loader */}
              {loading && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-450">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Syncing database boards...</span>
                </div>
              )}

              {/* Notes groups Render */}
              {!loading && notes.length > 0 && (
                <div className="space-y-12">
                  
                  {/* Pinned notes */}
                  {pinnedNotes.length > 0 && (
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-1.5 text-slate-400 pl-1 select-none">
                        <Pin size={11} className="rotate-35 text-amber-500" />
                        <span className="text-[10px] font-black tracking-widest uppercase">Pinned Notes</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pinnedNotes.map(n => renderNoteCard(n))}
                      </div>
                    </div>
                  )}

                  {/* Ordinary notes */}
                  {ordinaryNotes.length > 0 && (
                    <div className="space-y-3.5">
                      {pinnedNotes.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-400 pl-1 select-none border-t border-slate-200/50 pt-6">
                          <span className="text-[10px] font-black tracking-widest uppercase">Other notes</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ordinaryNotes.map(n => renderNoteCard(n))}
                      </div>
                    </div>
                  )}

                  {filteredNotes.length === 0 && (
                    <div className="py-16 text-center text-slate-450">
                      <Search size={32} className="mx-auto text-slate-300 mb-2.5" />
                      <h4 className="text-xs font-bold text-slate-700">No notes fit search filters</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Try resetting the keyword or folder lists.</p>
                    </div>
                  )}

                </div>
              )}

              {/* Empty board state */}
              {!loading && notes.length === 0 && (
                <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-205 shadow-sm max-w-md mx-auto">
                  <FolderOpen size={30} className="mx-auto text-slate-350 mb-3" />
                  <h4 className="text-xs font-black text-slate-750">Your note board is empty</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                    Start taking checklist cards or notes above! They will automatically save and sync securely.
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* Editor/Detail Modal for active click */}
      <AnimatePresence>
        {editingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-2xl border ${getTemplate(editColor).bg} ${getTemplate(editColor).border} shadow-2xl p-6 relative`}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200/50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">Edit Firestore Notes</span>
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="p-1 hover:bg-slate-200/50 border border-slate-200 rounded-lg text-slate-500"
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </div>

              <form onSubmit={handleSaveEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-white/70 px-3 py-2 border border-slate-250 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                {/* Content: Checklist editing is handled directly inside Card checkboxes so we show text area or labels for modal edit */}
                {(() => {
                  try {
                    const parsed = JSON.parse(editContent);
                    if (Array.isArray(parsed)) {
                      return (
                        <div className="space-y-1.5 p-3 bg-white/50 rounded-xl border border-slate-200/80">
                          <span className="text-[9.5px] font-bold text-slate-400 block pb-1">Checklist Items list:</span>
                          {parsed.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 py-0.5 justify-between select-none">
                              <div className="flex items-center gap-2 min-w-0">
                                {item.done ? (
                                  <CheckSquare size={13} className="text-emerald-500" />
                                ) : (
                                  <Square size={13} className="text-slate-400" />
                                )}
                                <span className={`text-xs truncate ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                              </div>
                            </div>
                          ))}
                          <span className="text-[8.5px] text-slate-400 pt-1 block border-t border-slate-200/50">
                            * Quick checks are interactive on notes board lists.
                          </span>
                        </div>
                      );
                    }
                  } catch (e) {}

                  return (
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Body Text</label>
                      <textarea
                        rows={5}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-white/70 px-3 py-2 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Labels (comma separated)</label>
                  <input
                    type="text"
                    value={editLabelsString}
                    onChange={(e) => setEditLabelsString(e.target.value)}
                    className="w-full bg-white/70 px-3 py-2 border border-slate-250 rounded-xl text-xs font-semibold text-slate-700"
                  />
                </div>

                {/* Color and controls choice */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
                  <div className="flex gap-1">
                    {COLOR_TEMPLATES.map(col => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => setEditColor(col.name)}
                        className={`w-5.5 h-5.5 rounded-full border ${col.bg} ${col.border} flex items-center justify-center transition-transform hover:scale-115`}
                      >
                        {editColor === col.name && <Check size={10} className="text-slate-805" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingNote(null)}
                      className="px-3.5 py-1.5 border border-slate-250 bg-white/80 hover:bg-white text-slate-600 rounded-xl text-[11px] font-bold"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] font-black shadow-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  // Card list single note rendering
  function renderNoteCard(note: KeepNote) {
    const template = getTemplate(note.color);
    
    // Parse content
    let isChecklist = false;
    let itemsList: Array<{ text: string; done: boolean }> = [];
    try {
      const parsed = JSON.parse(note.content);
      if (Array.isArray(parsed)) {
        isChecklist = true;
        itemsList = parsed;
      }
    } catch (e) {}

    return (
      <div
        key={note.id}
        onClick={() => handleOpenEdit(note)}
        className={`p-4 rounded-2xl border ${template.bg} ${template.border} flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden select-none hover:border-slate-400 cursor-pointer`}
      >
        <div className="space-y-3.5">
          {/* Header title & pin details */}
          <div className="flex items-stretch justify-between gap-2.5">
            <h4 className="text-xs font-extrabold text-slate-900 leading-tight block truncate pr-3 select-text">
              {note.title}
            </h4>
            <button
              onClick={(e) => handleTogglePin(note, e)}
              className={`opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded-lg transition-all ${note.isPinned ? 'opacity-100 text-amber-500' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <Pin size={11} className={note.isPinned ? 'fill-current text-amber-500' : ''} />
            </button>
          </div>

          {/* Content details */}
          <div className="text-[11px] text-slate-750 font-semibold select-text">
            {isChecklist ? (
              <div className="space-y-1.5">
                {itemsList.map((item, index) => (
                  <div 
                    key={index} 
                    onClick={(e) => { e.stopPropagation(); handleToggleChecklistItem(note, index); }}
                    className="flex items-center gap-2 py-0.5 justify-between hover:bg-black/5 p-1 rounded-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.done ? (
                        <CheckSquare size={12.5} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={12.5} className="text-slate-400 shrink-0" />
                      )}
                      <span className={`truncate leading-snug ${item.done ? 'line-through text-slate-405' : 'text-slate-700'}`}>
                        {item.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="line-clamp-6 whitespace-pre-wrap leading-relaxed select-text">
                {note.content}
              </p>
            )}
          </div>

          {/* Tags list */}
          {note.labels && note.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-black/5">
              {note.labels.map(lbl => lbl.trim() && (
                <span key={lbl} className="inline-flex items-center px-2 py-0.5 bg-black/5 text-[9px] font-bold text-slate-650 rounded-full capitalize select-none">
                  {lbl}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card toolbar on hover */}
        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 pt-3 border-t border-black/5 mt-4 transition-opacity select-none shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => handleToggleArchive(note, e)}
              title={note.isArchived ? 'Move to Notes' : 'Archive note'}
              className="p-1 hover:bg-black/5 text-slate-450 hover:text-slate-800 rounded transition-colors"
            >
              <Archive size={11} />
            </button>
            <button
              onClick={(e) => handleDeleteNoteCard(note.id, e)}
              title="Permantly delete note"
              className="p-1 hover:bg-black/5 text-slate-450 hover:text-red-500 rounded transition-colors"
            >
              <Trash2 size={11} strokeWidth={2.5} />
            </button>
          </div>

          <span className="text-[8px] font-mono font-bold text-slate-400">
            {note.updatedAt ? new Date(note.updatedAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Draft'}
          </span>
        </div>
      </div>
    );
  }
};

export default KeepView;
