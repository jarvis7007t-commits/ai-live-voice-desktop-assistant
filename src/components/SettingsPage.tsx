import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Palette, Code, Image as ImageIcon, MessageSquare, Zap, ChevronRight, ChevronDown, Settings, Cloud, Check, Key, Mic, Send, Eye, EyeOff, Edit2 } from 'lucide-react';
import { LiveConfig, AISetting } from '../types';

interface SettingsPageProps {
  config: LiveConfig;
  setConfig: React.Dispatch<React.SetStateAction<LiveConfig>>;
  onLoginClick: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  config,
  setConfig,
  onLoginClick,
}) => {
  const [showAIList, setShowAIList] = useState(true);
  const [openVersionListId, setOpenVersionListId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(!!config.customApiKey);

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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500">Configure your AI models, voice personas, and system capabilities.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onLoginClick}
            className="bg-[#6b21a8] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#581c87] transition-all active:scale-95 shadow-md shadow-purple-200"
          >
            Register
          </button>
          <button 
            onClick={onLoginClick}
            className="bg-slate-50 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200 active:scale-95"
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: API & Identity */}
          <div className="space-y-8">
            {/* API Configuration Section */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/30">
              <div className="flex items-center gap-3 mb-4">
                <Key size={20} className="text-amber-500" />
                <span className="font-bold text-slate-800">API Configuration</span>
              </div>
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gemini API Key</p>
                
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
                      className="bg-amber-500 text-white px-4 py-3 rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <span className="text-sm text-slate-600 font-mono truncate">
                        {isKeyVisible ? config.customApiKey : '••••••••••••••••••••••••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button 
                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button 
                        onClick={handleEditKey}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                  Your key enables advanced Live Vision and High-Intelligence models.
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline ml-1 font-bold">Get key.</a>
                </p>
              </div>
            </div>

            {/* Voice Selection Section */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Mic size={20} className="text-purple-500" />
                  <span className="font-bold text-slate-800">Voice Persona</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { name: 'Puck', color: 'bg-blue-500' },
                  { name: 'Charon', color: 'bg-slate-700' },
                  { name: 'Kore', color: 'bg-pink-500' },
                  { name: 'Fenrir', color: 'bg-amber-600' },
                  { name: 'Zephyr', color: 'bg-indigo-500' }
                ].map(voice => (
                  <button
                    key={voice.name}
                    onClick={() => setConfig(prev => ({ ...prev, voiceName: voice.name as any }))}
                    className={`group relative flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-300 ${
                      config.voiceName === voice.name 
                        ? 'bg-white shadow-xl ring-2 ring-purple-500 scale-105' 
                        : 'bg-white/50 hover:bg-white border border-slate-100 hover:border-purple-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${voice.color} flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110`}>
                      <Mic size={16} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight ${config.voiceName === voice.name ? 'text-purple-600' : 'text-slate-500'}`}>
                      {voice.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: AI Modules & Advanced */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-600" />
                <h2 className="font-bold text-slate-900">AI Modules</h2>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{config.aiSettings.filter(s => s.enabled).length} ACTIVE</span>
            </div>

            <div className="space-y-4">
              {config.aiSettings.map((setting: AISetting) => {
                const hasVersions = setting.versions && setting.versions.length > 0;
                const isVersionListOpen = openVersionListId === setting.id;
                
                return (
                  <div key={setting.id} className="group">
                    <div 
                      className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${
                        setting.enabled 
                          ? 'border-purple-200 bg-purple-50/20 shadow-sm shadow-purple-50' 
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                          setting.enabled ? 'bg-white shadow-sm' : 'bg-slate-50'
                        }`}>
                          {getIcon(setting.icon)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-[15px]">{setting.name}</h3>
                            {setting.enabled && setting.selectedVersion && (
                              <span className="text-[9px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                {setting.versions?.find(v => v.id === setting.selectedVersion)?.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 leading-snug mt-1">{setting.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {setting.enabled && hasVersions && (
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenVersionListId(isVersionListOpen ? null : setting.id);
                              }}
                              className="p-2.5 rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                            >
                              <ChevronDown size={18} className={`transition-transform duration-200 ${isVersionListOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                              {isVersionListOpen && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 top-full mt-1.5 z-[100] w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1 origin-top-right whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {setting.versions?.map((version) => (
                                    <button
                                      key={version.id}
                                      onClick={() => {
                                        selectVersion(setting.id, version.id);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                                        setting.selectedVersion === version.id
                                          ? 'bg-purple-600 text-white shadow-sm'
                                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100/80'
                                      }`}
                                    >
                                      <span className="truncate mr-2">{version.name}</span>
                                      {setting.selectedVersion === version.id && <Check size={12} className="shrink-0" />}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        <div 
                          className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${
                            setting.enabled ? 'bg-purple-600' : 'bg-slate-200'
                          }`}
                          onClick={(e) => toggleAISetting(e, setting.id)}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                            setting.enabled ? 'left-7' : 'left-1'
                          }`} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advanced Capabilities */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/30">
              <div className="flex items-center gap-3 mb-5">
                <Settings size={20} className="text-slate-600" />
                <span className="font-bold text-slate-800">Advanced System Info</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-white">
                  <p className="text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1">Webcam Rendering</p>
                  <p className="text-sm font-bold text-slate-700">{config.webcamSize}px Circle</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100 bg-white">
                  <p className="text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1">Developer Mode</p>
                  <p className="text-sm font-bold text-emerald-600">{config.isDeveloperMode ? 'ENABLED' : 'DISABLED'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
