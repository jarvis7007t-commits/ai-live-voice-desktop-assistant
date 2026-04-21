import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom duration-500">
      <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold">Install Wardenix OS</p>
          <p className="text-[10px] text-white/70">Add to home screen for native experience</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstall}
            className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors"
          >
            Install
          </button>
          <button 
            onClick={() => setShowBanner(false)}
            className="p-1 px-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
