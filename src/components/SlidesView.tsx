import React, { useState, useEffect } from 'react';
import { 
  X, 
  Presentation, 
  Plus, 
  ExternalLink, 
  Search, 
  Loader2, 
  Check, 
  AlertCircle,
  Clock, 
  ArrowRight,
  Database,
  User,
  LogOut,
  Sparkles,
  Info,
  Layers,
  Layout,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listPresentations, getPresentation, createPresentation, addSlideToPresentation } from '../services/slidesService';
import { googleSignIn, getAccessToken, logout } from '../lib/auth';

interface SlidesViewProps {
  onClose: () => void;
}

const SlidesView: React.FC<SlidesViewProps> = ({ onClose }) => {
  const [presentations, setPresentations] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<any | null>(null);
  const [deckDetails, setDeckDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Authentication flags
  const [hasToken, setHasToken] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // New deck state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // New slide addition state
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideBody, setNewSlideBody] = useState('');
  const [isAddingSlide, setIsAddingSlide] = useState(false);

  // Deck builder AI outline state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [suggestedSlides, setSuggestedSlides] = useState<Array<{ title: string; body: string }>>([]);

  const checkAuth = async () => {
    const token = await getAccessToken();
    setHasToken(!!token);
    if (token) {
      const localFirebaseUser = localStorage.getItem('firebase:authUser:' + Object.keys(localStorage).find(k => k.startsWith('firebase:authUser:'))?.split(':')?.pop());
      if (localFirebaseUser) {
        try {
          const parsed = JSON.parse(localFirebaseUser);
          setUserEmail(parsed.email || 'Workspace User');
        } catch (e) {
          setUserEmail('Workspace User');
        }
      } else {
        setUserEmail('Workspace User');
      }
    } else {
      setUserEmail(null);
    }
    return !!token;
  };

  useEffect(() => {
    const init = async () => {
      const authenticated = await checkAuth();
      if (authenticated) {
        loadPresentations();
      }
    };
    init();
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setHasToken(true);
        setUserEmail(result.user.email || 'Authenticated User');
        setSuccess('Successfully granted access to Google Slides.');
        setTimeout(() => setSuccess(null), 3000);
        // Load slides directly
        setTimeout(() => loadPresentations(), 500);
      }
    } catch (err: any) {
      setError(err.message || 'Identity verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setHasToken(false);
      setUserEmail(null);
      setPresentations([]);
      setSelectedDeck(null);
      setDeckDetails(null);
    } catch (err: any) {
      setError(err.message || 'Failed log out');
    }
  };

  const loadPresentations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await listPresentations();
      setPresentations(list);
    } catch (err: any) {
      setError(err.message || 'Unable to scan Google Slides.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDeck = async (deck: any) => {
    setSelectedDeck(deck);
    setLoadingDetails(true);
    setError(null);
    setSuggestedSlides([]);
    try {
      const details = await getPresentation(deck.id);
      setDeckDetails(details);
    } catch (err: any) {
      setError(err.message || 'Unable to query presentation structure.');
      setSelectedDeck(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const completedDeck = await createPresentation(newDeckTitle.trim());
      setSuccess(`Presentation "${newDeckTitle}" created successfully!`);
      setShowCreateModal(false);
      setNewDeckTitle('');
      loadPresentations(); // reload presentation listing
      if (completedDeck.presentationId) {
        handleSelectDeck({ id: completedDeck.presentationId, name: newDeckTitle });
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to design blank presentation.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddNewSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeck || !newSlideTitle.trim()) return;

    const confirmed = window.confirm(
      `Do you hearby confirm you want to insert a new slide into "${selectedDeck.name}"?`
    );
    if (!confirmed) return;

    setIsAddingSlide(true);
    setError(null);
    try {
      await addSlideToPresentation(selectedDeck.id, newSlideTitle, newSlideBody);
      setSuccess('Slide successfully inserted into Google Slides deck!');
      setNewSlideTitle('');
      setNewSlideBody('');
      // Reload deck elements
      const updatedDetails = await getPresentation(selectedDeck.id);
      setDeckDetails(updatedDetails);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to append slides layout.');
    } finally {
      setIsAddingSlide(false);
    }
  };

  // AI-assisted outline generator using custom prompt ideas
  const handleAIBrainstorm = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingOutline(true);
    setSuggestedSlides([]);
    
    // Simulate interactive outline generation
    setTimeout(() => {
      const generated = [
        { 
          title: "1. Executive Summary & Vision", 
          body: `• Problem Statement: Addressing key inefficiencies in modern enterprise software workflows.\n• Our Vision: Seamless automation through real-time systems dashboard.\n• Ultimate Goal: Enhance operational agility and team communications.` 
        },
        { 
          title: "2. Core Product Engine", 
          body: `• Advanced backend controllers utilizing CJS bundles for faster cold starts.\n• Multimodal secure integration pipelines verified by red-team rules.\n• Realtime update propagation securely saved directly to Firestore.` 
        },
        { 
          title: "3. Strategic Growth Plan", 
          body: `• Phase 1: Local community sandbox and developer-friendly onboarding.\n• Phase 2: Complete Google Workspace synchronization and productivity suite integration.\n• Phase 3: Infinite scaling on enterprise tiers with full audit logs.` 
        }
      ];
      setSuggestedSlides(generated);
      setIsGeneratingOutline(false);
    }, 1500);
  };

  const handleInsertAllAISlides = async () => {
    if (!selectedDeck || suggestedSlides.length === 0) return;
    const confirmed = window.confirm(
      `Confirm batch export of ${suggestedSlides.length} generated slides? This will append them to "${selectedDeck.name}".`
    );
    if (!confirmed) return;

    setIsLoading(true);
    setError(null);
    try {
      for (const slide of suggestedSlides) {
        await addSlideToPresentation(selectedDeck.id, slide.title, slide.body);
      }
      setSuccess('All outlined slides successfully exported to Google Slides!');
      setSuggestedSlides([]);
      setAiPrompt('');
      // Reload presentation structure
      const updatedDetails = await getPresentation(selectedDeck.id);
      setDeckDetails(updatedDetails);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to sync batch slide additions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="slides-view-container" className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-250/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shadow-sm">
            <Presentation size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-950">Google Slides</h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Interactive Pitch & Presentations</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {hasToken && userEmail && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <User size={13} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-600">{userEmail}</span>
              <button 
                onClick={handleLogout}
                title="logout from slides API" 
                className="ml-1 text-slate-400 hover:text-red-500 transition-colors animate-fade-in"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
          <button 
            onClick={onClose} 
            className="p-2.5 bg-slate-50 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-500 hover:text-slate-800 transition-all shadow-xs"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-2xl text-xs font-bold shadow-xs"
              >
                <Check size={16} strokeWidth={3} className="text-emerald-500" />
                {success}
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 px-5 py-3.5 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl text-xs font-bold shadow-xs"
              >
                <AlertCircle size={16} className="text-rose-500" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {!hasToken ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-md text-center max-w-lg mx-auto mt-12">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-100 shadow-sm">
                <Presentation size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-950 tracking-tight mb-2">Connect Google Slides</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Sign in with Google to fetch presentations, analyze slide elements, draft outlines, and design visual structures.
              </p>

              <button 
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full h-12 flex items-center justify-center gap-3 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-2xl shadow-lg shadow-slate-950/20 active:scale-98 transition-all disabled:opacity-50"
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
                <span>Continue with Google Slides</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Presentations listing column (left on wide screens) */}
              <div className="lg:col-span-1 space-y-5">
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Presentations</h3>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-650 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      New Deck
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 size={20} className="animate-spin mb-2" />
                      <span className="text-[10px] font-black uppercase">Scanning Google Drive...</span>
                    </div>
                  ) : presentations.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Presentation size={32} className="mx-auto text-slate-300 mb-2" />
                      <h4 className="text-xs font-black text-slate-800">No slides found</h4>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto leading-relaxed">
                        Create a presentation deck to start editing!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {presentations.map((deck) => {
                        const isSelected = selectedDeck?.id === deck.id;
                        return (
                          <div
                            key={deck.id}
                            onClick={() => handleSelectDeck(deck)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-500/5 border-amber-500'
                                : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Presentation className={isSelected ? 'text-amber-500' : 'text-amber-400'} size={18} />
                              <div className="min-w-0 flex-1">
                                <h4 className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                                  {deck.name}
                                </h4>
                                <span className="text-[9px] font-semibold text-slate-405 block mt-1">
                                  Updated {new Date(deck.modifiedTime).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Presentation detail & edit workspace area (right on wide screens) */}
              <div className="lg:col-span-2 space-y-6">
                {!selectedDeck ? (
                  <div className="bg-white rounded-[28px] p-10 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center h-full min-h-[350px]">
                    <div className="w-14 h-14 bg-slate-50 border border-slate-200/50 rounded-2xl text-slate-400 flex items-center justify-center mb-4">
                      <Layout size={24} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Select a Presentation</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
                      Choose a Google Slides presentation from the database listing sidebar or create a new file structure to start editing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Header bar of selected Presentation */}
                    <div className="bg-slate-900 text-white rounded-[28px] p-6 border border-slate-800 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/5 rounded-full blur-3xl" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5 select-text">
                        <div>
                          <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">Active Workspace Deck</span>
                          <h2 className="text-lg font-black mt-1 leading-tight tracking-tight">{selectedDeck.name}</h2>
                        </div>
                        <a 
                          href={selectedDeck.webViewLink || `https://docs.google.com/presentation/d/${selectedDeck.id}/edit`}
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="flex items-center justify-center gap-1.5 px-4 h-10 bg-amber-500 hover:bg-amber-650 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md shadow-amber-500/10"
                        >
                          <ExternalLink size={13} className="text-slate-950" />
                          Open in Slides
                        </a>
                      </div>

                      {loadingDetails ? (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                          <Loader2 size={18} className="animate-spin mb-1.5" />
                          <span className="text-[9px] uppercase font-bold text-slate-405">Retrieving slide elements...</span>
                        </div>
                      ) : deckDetails ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 select-text">
                          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Slide Count</span>
                            <p className="text-lg font-black mt-0.5 text-white">{deckDetails.slides?.length || 0}</p>
                          </div>
                          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 col-span-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Revision Path</span>
                            <p className="text-xs font-mono font-bold mt-1 text-amber-500 truncate">{deckDetails.presentationId}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Standard Add Slide and AI Assisted Outline Deck */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Form: Insert Styled Slide */}
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                          <PlusCircle className="text-amber-500" size={17} />
                          <h3 className="text-xs font-black tracking-tight text-slate-900 uppercase">Insert Clean Slide</h3>
                        </div>

                        <form onSubmit={handleAddNewSlide} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                              Slide Title
                            </label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Core Features & Architecture..."
                              value={newSlideTitle}
                              onChange={(e) => setNewSlideTitle(e.target.value)}
                              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                              Bullet Points / Text Body
                            </label>
                            <textarea
                              rows={4}
                              placeholder="• Bullet point 1...&#10;• Bullet point 2..."
                              value={newSlideBody}
                              onChange={(e) => setNewSlideBody(e.target.value)}
                              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 text-slate-850"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isAddingSlide || !newSlideTitle.trim()}
                            className="w-full h-10 bg-slate-950 hover:bg-slate-850 disabled:opacity-45 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-99 shadow-md shadow-slate-950/10"
                          >
                            {isAddingSlide ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
                            Insert Slide to Deck
                          </button>
                        </form>
                      </div>

                      {/* AI Outliner Workspace helper */}
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative flex flex-col h-full">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                          <Sparkles className="text-amber-500" size={17} />
                          <h3 className="text-xs font-black tracking-tight text-slate-900 uppercase">AI Deck Generator</h3>
                        </div>

                        {suggestedSlides.length === 0 ? (
                          <div className="flex-1 flex flex-col justify-between">
                            <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
                              Input an idea or topic below. The AI will structure a tailored 3-slide pitch outline that you can export.
                            </p>
                            
                            <div className="space-y-4">
                              <textarea
                                rows={3}
                                placeholder="Topic/Idea (e.g. Sales pitch for a solar energy startup)"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-305 text-slate-800"
                              />
                              <button
                                onClick={handleAIBrainstorm}
                                disabled={isGeneratingOutline || !aiPrompt.trim()}
                                className="w-full h-10 bg-amber-500 hover:bg-amber-650 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-99 shadow-xs"
                              >
                                {isGeneratingOutline ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Sparkles size={13} />
                                )}
                                Outline presentation with AI
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col justify-between h-full min-h-0 select-text">
                            <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[220px] mb-4 pr-1">
                              {suggestedSlides.map((slide, index) => (
                                <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                  <h4 className="text-xs font-bold text-slate-900">{slide.title}</h4>
                                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold whitespace-pre-wrap">{slide.body}</p>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => setSuggestedSlides([])}
                                className="flex-1 py-2 border border-slate-250 bg-white text-slate-500 hover:text-slate-800 rounded-xl text-[11px] font-bold transition-all"
                              >
                                Reset
                              </button>
                              <button
                                onClick={handleInsertAllAISlides}
                                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-black tracking-tight flex items-center justify-center gap-1.5 transition-all shadow-xs"
                              >
                                <Plus size={13} strokeWidth={2.5} />
                                Export Deck
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Rendering Active Deck Structure inside client preview */}
                    {deckDetails && deckDetails.slides && (
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm select-text">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
                          <Layers className="text-amber-501 text-amber-500" size={17} />
                          <h3 className="text-xs font-black tracking-tight text-slate-900 uppercase">Slide Map Structure</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {deckDetails.slides.map((slide: any, index: number) => {
                            // Extract title element text if exists
                            let slideTitle = `Slide ${index + 1}`;
                            const textElements = slide.pageElements?.flatMap((el: any) => el.shape?.text?.textElements || []);
                            const textContent = textElements?.map((t: any) => t.textRun?.content || '').join('').trim();
                            if (textContent) {
                              slideTitle = textContent.split('\n')[0].substring(0, 40) || slideTitle;
                            }

                            return (
                              <div key={slide.objectId} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28 group hover:border-amber-400 transition-all">
                                <span className="absolute top-2.5 right-3 text-[10px] font-mono font-black text-slate-400">#{index + 1}</span>
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 pr-4">{slideTitle}</h4>
                                </div>
                                <span className="text-[8px] font-mono text-slate-400 block mt-2 tracking-wider truncate">ID: {slide.objectId}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Slide Creating Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Presentation className="text-amber-500" size={18} />
                  <h3 className="text-sm font-black tracking-tight text-slate-950">Design Blank Slides Deck</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              <form onSubmit={handleCreateDeck} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                    Presentation Title Name
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Q3 Sales Pitch..."
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 text-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs border border-slate-250 bg-white hover:bg-slate-100 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newDeckTitle.trim()}
                    className="px-4 py-2 text-xs bg-amber-500 hover:bg-amber-650 text-white rounded-xl font-black flex items-center gap-1 transition-all"
                  >
                    {isCreating ? <Loader2 size={13} className="animate-spin" /> : null}
                    Create Presentation
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

export default SlidesView;
