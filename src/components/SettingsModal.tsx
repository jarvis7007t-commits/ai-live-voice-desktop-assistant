import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Brain, Palette, Code, Image as ImageIcon, MessageSquare, Zap, ChevronRight, ChevronDown, Settings, Cloud, Check, Key, Mic, Send, Eye, EyeOff, Edit2 } from 'lucide-react';
import { LiveConfig, AISetting } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LiveConfig;
  setConfig: React.Dispatch<React.SetStateAction<LiveConfig>>;
  onLoginClick: () => void;
  onSendMessage: (text: string) => void;
  isConnected: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  config,
  setConfig,
  onLoginClick,
  onSendMessage,
  isConnected
}) => {
  const [showAIList, setShowAIList] = useState(false);
  const [openVersionListId, setOpenVersionListId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(!!config.customApiKey);
  const [chatInput, setChatInput] = useState('');

  if (!isOpen) return null;

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleSendKey = () => {
    if (apiKeyInput.trim()) {
      setConfig(prev => ({ ...prev, customApiKey: apiKeyInput.trim() }));
      setApiKeyInput('');
      setIsKeySaved(true);
    }
  };

  const handleEditKey = () => {
    setApiKeyInput(config.customApiKey || '');
    setIsKeySaved(false);
  };

  const selectVersion = (aiId: string, versionId: string) => {
    setConfig(prev => ({
      ...prev,
      model: versionId,
      aiSettings: prev.aiSettings.map(s => 
        s.id === aiId ? { ...s, selectedVersion: versionId } : s
      )
    }));
    setOpenVersionListId(null);
  };

  const toggleAISetting = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfig(prev => {
      const newSettings = prev.aiSettings.map(s => 
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );
      
      // If we just enabled a module that has versions, and no model is selected or we want to switch to it
      const toggledSetting = newSettings.find(s => s.id === id);
      let newModel = prev.model;
      if (toggledSetting?.enabled && toggledSetting.selectedVersion) {
        newModel = toggledSetting.selectedVersion;
      }

      return {
        ...prev,
        model: newModel,
        aiSettings: newSettings
      };
    });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'sparkles': return <Sparkles size={18} className="text-purple-500" />;
      case 'brain': return <Brain size={18} className="text-blue-500" />;
      case 'palette': return <Palette size={18} className="text-pink-500" />;
      case 'code': return <Code size={18} className="text-green-500" />;
      case 'image': return <ImageIcon size={18} className="text-orange-500" />;
      case 'message': return <MessageSquare size={18} className="text-cyan-500" />;
      case 'zap': return <Zap size={18} className="text-yellow-500" />;
      case 'cloud': return <Cloud size={18} className="text-blue-400" />;
      default: return <Sparkles size={18} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        drag
        dragMomentum={false}
        className="bg-white w-full max-w-[450px] h-[650px] rounded-xl p-6 flex flex-col relative overflow-hidden shadow-2xl border border-slate-200"
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle Area */}
        <div className="absolute top-0 left-0 right-0 h-10 cursor-move z-0" />
        {/* Top Header with Auth Buttons */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          <div className="flex gap-3">
            <button 
              onClick={onLoginClick}
              className="bg-[#6b21a8] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-[#581c87] transition-all active:scale-95"
            >
              Register
            </button>
            <button 
              onClick={onLoginClick}
              className="bg-slate-50 text-slate-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200 active:scale-95"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {/* Chat Bot Toggle Section */}
          <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="text-blue-500" />
                <span className="font-bold text-slate-700">Wardenix Chat Terminal</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 px-1">
              Open a dedicated high-tech window for text, image, and file-based interaction.
            </p>
          </div>

          {/* API Configuration Section */}
          <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/30">
            <div className="flex items-center gap-3 mb-3">
              <Key size={18} className="text-amber-500" />
              <span className="font-bold text-slate-700">API Configuration</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gemini API Key</p>
              
              {!isKeySaved ? (
                <div className="relative flex gap-2">
                  <input 
                    type={isKeyVisible ? "text" : "password"}
                    placeholder="Paste your API key here..."
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                  <button 
                    onClick={handleSendKey}
                    disabled={!apiKeyInput.trim()}
                    className="bg-amber-500 text-white p-3 rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm text-slate-600 font-mono truncate">
                      {isKeyVisible ? config.customApiKey : '••••••••••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button 
                      onClick={() => setIsKeyVisible(!isKeyVisible)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      title={isKeyVisible ? "Hide Key" : "View Key"}
                    >
                      {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button 
                      onClick={handleEditKey}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Edit Key"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              <p className="text-[9px] text-slate-400 leading-tight px-1">
                Your key is stored locally for this session. It enables Live Vision and Voice features.
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline ml-1 font-bold"
                >
                  Get a free Gemini API key here.
                </a>
              </p>
            </div>
          </div>

          {/* Voice Selection Section */}
          <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Mic size={18} className="text-purple-500" />
                <span className="font-bold text-slate-700">Voice Persona</span>
              </div>
              <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {config.voiceName} Active
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { name: 'Puck', color: 'bg-blue-500', desc: 'Male • Energetic' },
                { name: 'Charon', color: 'bg-slate-700', desc: 'Male • Deep' },
                { name: 'Kore', color: 'bg-pink-500', desc: 'Female • Soft' },
                { name: 'Fenrir', color: 'bg-amber-600', desc: 'Male • Bold' },
                { name: 'Zephyr', color: 'bg-indigo-500', desc: 'Female • Melodic' }
              ].map(voice => (
                <button
                  key={voice.name}
                  onClick={() => {
                    setConfig(prev => ({ ...prev, voiceName: voice.name as any }));
                    if (isConnected) {
                      onSendMessage(`[SYSTEM] Restarting session to apply ${voice.name} voice...`);
                    }
                  }}
                  className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 ${
                    config.voiceName === voice.name 
                      ? 'bg-white shadow-lg ring-2 ring-purple-500 scale-105' 
                      : 'bg-white/50 hover:bg-white border border-slate-100 hover:border-purple-200'
                  }`}
                  title={voice.desc}
                >
                  <div className={`w-8 h-8 rounded-full ${voice.color} flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110`}>
                    <Mic size={14} />
                  </div>
                  <span className={`text-[9px] font-bold tracking-tight ${config.voiceName === voice.name ? 'text-purple-600' : 'text-slate-500'}`}>
                    {voice.name}
                  </span>
                  {config.voiceName === voice.name && (
                    <motion.div 
                      layoutId="voice-active"
                      className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center"
                    >
                      <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 mt-3 px-1 italic">
              * Selection is saved automatically and persists across sessions.
            </p>
          </div>

          {/* Webcam Size Section */}
          <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/30">
            <div className="flex items-center gap-3 mb-3">
              <ImageIcon size={18} className="text-cyan-500" />
              <span className="font-bold text-slate-700">Webcam Circle Size</span>
            </div>
            <div className="space-y-3">
              <input 
                type="range" 
                min="100" 
                max="400" 
                value={config.webcamSize} 
                onChange={(e) => setConfig(prev => ({ ...prev, webcamSize: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>Small</span>
                <span className="text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded">{config.webcamSize}px</span>
                <span>Large</span>
              </div>
            </div>
          </div>

          {/* Wardenix Core Toggle Button */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white text-slate-700 mb-4 hover:border-blue-400 transition-all">
            <div className="flex items-center gap-3">
              <Code size={20} className="text-blue-600" />
              <span className="font-bold text-lg">Wardenix Core</span>
            </div>
            <button 
              onClick={() => setConfig(prev => ({ ...prev, isDeveloperMode: !prev.isDeveloperMode }))}
              className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-500 ${
                config.isDeveloperMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <motion.div
                animate={{ rotate: config.isDeveloperMode ? 360 : 0 }}
                transition={{ duration: 1.5, repeat: config.isDeveloperMode ? Infinity : 0, ease: "linear" }}
              >
                <Settings size={24} />
              </motion.div>
            </button>
          </div>

          {/* AI Modules Toggle Button */}
          <button 
            onClick={() => setShowAIList(!showAIList)}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all mb-6 ${
              showAIList 
                ? 'border-purple-600 bg-purple-600 text-white' 
                : 'border-slate-200 bg-white text-slate-700 hover:border-purple-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={20} className={showAIList ? 'text-white' : 'text-purple-600'} />
              <span className="font-bold text-lg">AI Modules</span>
            </div>
            {showAIList ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>

          <AnimatePresence>
            {showAIList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 mb-8">
                  <p className="text-sm text-slate-500 px-1">Enable specialized modules for Coding, Education, Health, and more.</p>
                  {config.aiSettings.map((setting: AISetting) => {
                    const hasVersions = setting.versions && setting.versions.length > 0;
                    const isVersionListOpen = openVersionListId === setting.id;
                    
                    return (
                      <div key={setting.id} className="space-y-2">
                        <div 
                          className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                            setting.enabled 
                              ? 'border-purple-200 bg-purple-50/10' 
                              : 'border-slate-100 bg-white hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                              setting.enabled ? 'bg-white shadow-sm' : 'bg-slate-50'
                            }`}>
                              {getIcon(setting.icon)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800 text-sm">{setting.name}</h3>
                                {setting.enabled && setting.selectedVersion && (
                                  <span className="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                    {setting.versions?.find(v => v.id === setting.selectedVersion)?.name}
                                  </span>
                                )}
                                {setting.enabled && setting.selectedVersion?.includes('flash') && (
                                  <span className="text-[8px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ml-1">
                                    Free Tier
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 leading-tight mt-0.5">{setting.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {setting.enabled && hasVersions && (
                              <button 
                                onClick={() => setOpenVersionListId(isVersionListOpen ? null : setting.id)}
                                className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                                title="Select Version"
                              >
                                <ChevronRight size={16} className={`transition-transform ${isVersionListOpen ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                            <div 
                              className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                                setting.enabled ? 'bg-purple-600' : 'bg-slate-200'
                              }`}
                              onClick={(e) => toggleAISetting(e, setting.id)}
                            >
                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                                setting.enabled ? 'left-6' : 'left-1'
                              }`} />
                            </div>
                          </div>
                        </div>

                        {/* Module API Key Input */}
                        <AnimatePresence>
                          {setting.enabled && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="ml-14 overflow-hidden"
                            >
                              <div className="pb-2">
                                <input 
                                  type="password"
                                  placeholder={`${setting.name} API Key...`}
                                  value={setting.apiKey || ''}
                                  onChange={e => setConfig(prev => ({
                                    ...prev,
                                    aiSettings: prev.aiSettings.map(s => 
                                      s.id === setting.id ? { ...s, apiKey: e.target.value } : s
                                    )
                                  }))}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[10px] text-slate-600 placeholder:text-slate-300 focus:outline-none focus:border-purple-300 transition-all"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Version List Dropdown */}
                        <AnimatePresence>
                          {isVersionListOpen && setting.enabled && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="ml-14 space-y-1 overflow-hidden"
                            >
                              {setting.versions?.map((version) => (
                                <button
                                  key={version.id}
                                  onClick={() => selectVersion(setting.id, version.id)}
                                  className={`w-full text-left px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                                    setting.selectedVersion === version.id
                                      ? 'bg-purple-600 text-white shadow-sm'
                                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {version.name}
                                  {setting.selectedVersion === version.id && <Check size={12} />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wardenix Specialized Tools Section */}
          <div className="mt-4 pt-8 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">System Capabilities</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Vision Mode</p>
                <p className="text-xs font-medium text-slate-700">Real-time Analysis</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Automation</p>
                <p className="text-xs font-medium text-slate-700">A to Z PC Control</p>
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;
