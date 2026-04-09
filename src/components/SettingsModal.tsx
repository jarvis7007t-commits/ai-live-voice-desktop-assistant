import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Brain, Palette, Code, Image as ImageIcon, MessageSquare, Zap, ChevronRight, ChevronDown, Settings, Cloud, Check } from 'lucide-react';
import { LiveConfig, AISetting } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LiveConfig;
  setConfig: React.Dispatch<React.SetStateAction<LiveConfig>>;
  onLoginClick: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  config,
  setConfig,
  onLoginClick
}) => {
  const [showAIList, setShowAIList] = useState(false);
  const [openVersionListId, setOpenVersionListId] = useState<string | null>(null);

  if (!isOpen) return null;

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
        className="bg-white w-full max-w-[450px] h-[650px] rounded-xl p-6 flex flex-col relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header with Auth Buttons */}
        <div className="flex justify-end gap-3 mb-8">
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

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {/* Developer Ai Toggle Button */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white text-slate-700 mb-4 hover:border-blue-400 transition-all">
            <div className="flex items-center gap-3">
              <Code size={20} className="text-blue-600" />
              <span className="font-bold text-lg">Developer Ai</span>
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
                  <p className="text-sm text-slate-500 px-1">Enable AI systems for effective website development.</p>
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

          {/* Website Development Specific Section */}
          <div className="mt-4 pt-8 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Development Tools</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Vision Mode</p>
                <p className="text-xs font-medium text-slate-700">UI/UX Analysis</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Automation</p>
                <p className="text-xs font-medium text-slate-700">Browser Testing</p>
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;
