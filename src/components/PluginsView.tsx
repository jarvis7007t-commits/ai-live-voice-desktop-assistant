import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus,
  Check,
  Github,
  Mail,
  Calendar,
  HardDrive,
  Chrome,
  LayoutGrid,
  Sparkles,
  Layers,
  Network,
  Cpu,
  Zap,
  Gamepad2,
  RefreshCw,
  Cloud,
  Activity,
  Smartphone,
  Smile,
  Triangle,
  Briefcase,
  Compass,
  Workflow,
  MessageSquare,
  Users,
  Share2,
  Tv,
  CreditCard,
  Box,
  FileText,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  LineChart,
  Megaphone,
  Wallet,
  Coins,
  TrendingUp,
  CheckSquare,
  ClipboardList,
  Database,
  Globe,
  Inbox,
  Video,
  Presentation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { googleSignIn } from '../lib/auth';

const LAUNCHABLE_PLUGINS = ['gmail', 'calendar', 'drive', 'meet', 'slides', 'keep'];

interface PluginCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'core' | 'coding' | 'productivity' | 'workspace';
}

interface PluginsViewProps {
  user: any;
  onClose: () => void;
  onUserUpdate?: (updatedUserProfile: any) => void;
  onLaunchPlugin?: (id: string) => void;
}

const PluginsView: React.FC<PluginsViewProps> = ({ user, onClose, onUserUpdate, onLaunchPlugin }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnector, setSelectedConnector] = useState<PluginCard | null>(null);
  const [authLoading, setAuthLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Track connected states
  const [isConnected, setIsConnected] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('wardenix_connected_plugins');
    const defaultConnections = {
      'chrome': true,
      'netlify': true,
      'github': true,
      'cloudflare': true,
      'stripe': true,
      'gmail': true,
      'calendar': true,
      'drive': true,
      'meet': true,
      'slides': true,
      'keep': true
    };
    if (saved) {
      try {
        return {
          ...defaultConnections,
          ...JSON.parse(saved)
        };
      } catch (e) {}
    }
    return defaultConnections;
  });

  useEffect(() => {
    localStorage.setItem('wardenix_connected_plugins', JSON.stringify(isConnected));
  }, [isConnected]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleConnect = async (id: string, name: string) => {
    setAuthLoading(id);
    try {
      // Trigger Google Sign-in popup gracefully to authorize connection
      const result = await googleSignIn();
      if (result) {
        setIsConnected(prev => ({
          ...prev,
          [id]: true
        }));
        
        // Show rich success toast with user information
        setToast({
          message: `Connected ${name} successfully via Google profile (${result.user.email})!`,
          type: 'success'
        });

        // Optionally update the root state if user signed in with another account
        if (onUserUpdate) {
          onUserUpdate({
            email: result.user.email || '',
            name: result.user.displayName || 'Google User',
            isLoggedIn: true
          });
        }
      } else {
        // User closed or cancelled without error
        setToast({
          message: `Google authorization cancelled for ${name}.`,
          type: 'info'
        });
      }
    } catch (err: any) {
      console.error('Plugin connection error:', err);
      setToast({
        message: err.message || `Failed to connect with Google.`,
        type: 'error'
      });
    } finally {
      setAuthLoading(null);
    }
  };

  const handleDisconnect = (id: string, name: string) => {
    setIsConnected(prev => ({
      ...prev,
      [id]: false
    }));
    setToast({
      message: `Disconnected ${name} connection.`,
      type: 'info'
    });
  };

  const toggleConnection = (plugin: PluginCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const id = plugin.id;
    if (isConnected[id]) {
      handleDisconnect(id, plugin.name);
    } else {
      handleConnect(id, plugin.name);
    }
  };

  const connectorsList: PluginCard[] = [
    // Browser Control Section
    { 
      id: 'chrome', 
      name: 'Chrome', 
      description: 'Control Chrome with Codex', 
      icon: <Chrome className="text-slate-900 group-hover:rotate-12 transition-transform" size={24} />, 
      category: 'core' 
    },
    // Productivity & Systems (Image 2)
    { 
      id: 'linear', 
      name: 'Linear', 
      description: 'Find and reference issues and projects.', 
      icon: <Compass className="text-indigo-600 group-hover:rotate-12 transition-transform" size={24} />, 
      category: 'productivity' 
    },
    { 
      id: 'atlassian', 
      name: 'Atlassian Rovo', 
      description: 'Manage Jira and Confluence fast', 
      icon: <Workflow className="text-blue-600 group-hover:rotate-12 transition-transform" size={24} />, 
      category: 'productivity' 
    },
    { 
      id: 'calendar', 
      name: 'Google Calendar', 
      description: 'Manage Google Calendar events and meetings', 
      icon: <Calendar className="text-[#4285F4] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'gmail', 
      name: 'Gmail', 
      description: 'Read and manage Gmail messages and inline drafts', 
      icon: <Mail className="text-[#EA4335] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'meet', 
      name: 'Google Meet', 
      description: 'Create instantly scheduled meeting spaces and customize configurations securely', 
      icon: <Video className="text-[#0F9D58] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'slides', 
      name: 'Google Slides', 
      description: 'Interactive outline generator & presentation slides designer', 
      icon: <Presentation className="text-amber-600 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'keep', 
      name: 'Google Keep', 
      description: 'Firebase persistent checklist cards & secure notes board', 
      icon: <CheckSquare className="text-amber-500 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'slack', 
      name: 'Slack', 
      description: 'Read and manage Slack', 
      icon: <MessageSquare className="text-[#4A154B] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'productivity' 
    },
    { 
      id: 'teams', 
      name: 'Teams', 
      description: 'Summarize Teams and draft follow-ups', 
      icon: <Users className="text-[#4682B4] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'productivity' 
    },
    { 
      id: 'sharepoint', 
      name: 'SharePoint', 
      description: 'Summarize SharePoint sites and files', 
      icon: <Share2 className="text-[#008080] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'productivity' 
    },
    { 
      id: 'outlook_email', 
      name: 'Outlook Email', 
      description: 'Triage Outlook inboxes and draft replies', 
      icon: <Mail className="text-[#0078D4] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'outlook_calendar', 
      name: 'Outlook Calendar', 
      description: 'Manage Outlook schedules and meetings', 
      icon: <Calendar className="text-[#0078D4] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'jam', 
      name: 'Jam', 
      description: 'Screen record with context', 
      icon: <Tv className="text-rose-500 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'productivity' 
    },
    { 
      id: 'stripe', 
      name: 'Stripe', 
      description: 'Payments and business tools', 
      icon: <CreditCard className="text-[#635BFF] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'productivity' 
    },
    { 
      id: 'box', 
      name: 'Box', 
      description: 'Search and reference your documents', 
      icon: <Box className="text-[#0061FF] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'drive', 
      name: 'Google Drive', 
      description: 'Work across Drive, Docs, Sheets, and Slides', 
      icon: <HardDrive className="text-[#34A853] group-hover:scale-110 transition-transform" size={24} />, 
      category: 'workspace' 
    },
    { 
      id: 'notion', 
      name: 'Notion', 
      description: 'Notion workflows for specs, research, and documentation', 
      icon: <FileText className="text-black group-hover:scale-110 transition-transform" size={24} />, 
      category: 'productivity' 
    },
    // Coding Category (Image 1)
    { 
      id: 'huggingface', 
      name: 'Hugging Face', 
      description: 'Inspect models, datasets, Spaces, and...', 
      icon: <Smile className="text-amber-500 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    { 
      id: 'netlify', 
      name: 'Netlify', 
      description: 'Deploy projects and manage releases', 
      icon: <Network className="text-teal-500 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    { 
      id: 'vercel', 
      name: 'Vercel', 
      description: 'Build and deploy web apps and agents', 
      icon: <Triangle className="text-black fill-black group-hover:scale-110 transition-transform rotate-180" size={22} />, 
      category: 'coding' 
    },
    { 
      id: 'gamestudio', 
      name: 'Game Studio', 
      description: 'Design, prototype, and ship browser...', 
      icon: <Gamepad2 className="text-rose-500 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    { 
      id: 'superpowers', 
      name: 'Superpowers', 
      description: 'Planning, TDD, debugging, and delivery...', 
      icon: <Zap className="text-yellow-500 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    { 
      id: 'github', 
      name: 'GitHub', 
      description: 'Triage PRs, issues, CI, and publish flows', 
      icon: <Github className="text-slate-900 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    { 
      id: 'circleci', 
      name: 'CircleCI', 
      description: 'Build, test, and deploy any application', 
      icon: <RefreshCw className="text-black group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    { 
      id: 'cloudflare', 
      name: 'Cloudflare', 
      description: 'Cloudflare platform guidance with official...', 
      icon: <Cloud className="text-orange-500 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    { 
      id: 'sentry', 
      name: 'Sentry', 
      description: 'Inspect recent Sentry issues and events', 
      icon: <Activity className="text-purple-600 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    { 
      id: 'buildios', 
      name: 'Build iOS Apps', 
      description: 'Build, refine, and debug iOS apps with Ap...', 
      icon: <Smartphone className="text-blue-600 group-hover:scale-110 transition-transform" size={24} />, 
      category: 'coding' 
    },
    // New Plugins from Image 1
    {
      id: 'amplitude',
      name: 'Amplitude',
      description: 'Product analytics and funnels',
      icon: <LineChart className="text-[#022ef7] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'attio',
      name: 'Attio',
      description: 'Attio connects Codex directly to your CRM...',
      icon: <Briefcase className="text-slate-900 group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'brand24',
      name: 'Brand24',
      description: 'The Brand24 app in Codex lets marketing...',
      icon: <Megaphone className="text-[#0bd67a] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'brex',
      name: 'Brex',
      description: 'Connect Brex to Codex and review your...',
      icon: <Wallet className="text-slate-950 group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'cartacrm',
      name: 'Carta CRM',
      description: 'Carta CRM helps investment teams stay o...',
      icon: <TrendingUp className="text-slate-800 group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'channel99',
      name: 'Channel99',
      description: 'Channel99 real time go to market...',
      icon: <Zap className="text-[#a3e635] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'circleback',
      name: 'Circleback',
      description: 'Circleback helps teams get the most out ...',
      icon: <RefreshCw className="text-[#ff5c35] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'clickup',
      name: 'ClickUp',
      description: 'Turn Codex into your ClickUp command...',
      icon: <CheckSquare className="text-[#ff00df] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'commonroom',
      name: 'Common Room',
      description: 'Embed complete buyer intelligence...',
      icon: <Users className="text-[#0b0c10] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'conductor',
      name: 'Conductor',
      description: 'The Conductor MCP server retrieves...',
      icon: <Cpu className="text-[#84cc16] group-hover:scale-110 transition-transform" size={24} />,
      category: 'coding'
    },
    {
      id: 'couplerio',
      name: 'Coupler.io',
      description: 'Analyze multi-channel marketing, financi...',
      icon: <Database className="text-[#104df6] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'coveo',
      name: 'Coveo',
      description: 'Search your enterprise content',
      icon: <Search className="text-[#f52a2a] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'demandbase',
      name: 'Demandbase',
      description: 'Demandbase integration with Codex give...',
      icon: <TrendingUp className="text-[#0a369d] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'docket',
      name: 'Docket',
      description: 'Docket AI makes your sales knowledge...',
      icon: <Sparkles className="text-violet-600 group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    // New Plugins from Image 2
    {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Connect your Razorpay account to access...',
      icon: <CreditCard className="text-[#0b72e7] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'readai',
      name: 'Read AI',
      description: 'Read AI brings your meeting intelligence...',
      icon: <Tv className="text-[#6366f1] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'responsive',
      name: 'Responsive',
      description: 'The Responsive App makes it easy to work...',
      icon: <Workflow className="text-[#22c55e] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'semrush',
      name: 'Semrush',
      description: 'The Semrush MCP provides structured,...',
      icon: <Activity className="text-[#ff6400] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'signnow',
      name: 'SignNow',
      description: 'Get documents signed faster without...',
      icon: <FileText className="text-[#0256e3] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'skywatch',
      name: 'SkyWatch',
      description: 'Search and explore satellite imagery from...',
      icon: <Globe className="text-[#06b6d4] group-hover:scale-110 transition-transform" size={24} />,
      category: 'coding'
    },
    {
      id: 'streak',
      name: 'Streak',
      description: 'Streak is a CRM built directly into Gmail, s...',
      icon: <Inbox className="text-[#ff6045] group-hover:scale-110 transition-transform" size={24} />,
      category: 'workspace'
    },
    {
      id: 'teamwork',
      name: 'Teamwork.com',
      description: 'Connect to sync Teamwork projects and...',
      icon: <Users className="text-[#1e3a8a] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'unitedrentals',
      name: 'United Rentals',
      description: 'Get the right equipment for the job...',
      icon: <Box className="text-[#0231cf] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'waldo',
      name: 'Waldo',
      description: 'Waldo is an AI-powered strategy platfor...',
      icon: <Sparkles className="text-[#e20074] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'windsorai',
      name: 'Windsor.ai',
      description: 'Windsor.ai connects your marketing and...',
      icon: <Layers className="text-[#0f172a] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'asana',
      name: 'Asana',
      description: 'Read and manage Asana',
      icon: <ClipboardList className="text-[#fc636b] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    },
    {
      id: 'zoom',
      name: 'Zoom',
      description: 'Use Zoom meeting context and build...',
      icon: <Tv className="text-[#0b5cff] group-hover:scale-110 transition-transform" size={24} />,
      category: 'productivity'
    }
  ];

  const filteredConnectors = connectorsList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex flex-col h-full bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 font-sans">
      
      {/* Toast Notification HUD */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-full bg-slate-950 text-white shadow-2xl border border-slate-800 text-xs font-bold leading-none max-w-md w-max"
          >
            {toast.type === 'success' ? (
              <ShieldCheck className="text-emerald-400 shrink-0" size={16} />
            ) : toast.type === 'error' ? (
              <AlertCircle className="text-rose-400 shrink-0" size={16} />
            ) : (
              <Sparkles className="text-cyan-400 shrink-0" size={16} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Authentication Overlay */}
      <AnimatePresence>
        {authLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md text-white"
          >
            <div className="relative flex items-center justify-center w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-850 border-t-cyan-400"></div>
              <Sparkles className="text-cyan-400" size={32} />
            </div>
            <h2 className="text-lg font-black tracking-tight text-white">Google Secure Integration Auth</h2>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">Protocol Gate Activated</p>
            <p className="text-xs text-slate-350 text-center max-w-sm mt-4 font-medium leading-relaxed px-4">
              Syncing credentials securely with Google to allow access to website systems. Please approve the secure popup Window.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connector Detail Modal Overlay */}
      <AnimatePresence>
        {selectedConnector && !authLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-sm"
            onClick={() => setSelectedConnector(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] p-8 border border-slate-100 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100/60 flex items-center justify-center border border-slate-200/50 shadow-sm">
                    {selectedConnector.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950 tracking-tight">{selectedConnector.name}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">{selectedConnector.category} Plugin</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    setSelectedConnector(null);
                    toggleConnection(selectedConnector, e);
                  }}
                  className={`px-5 py-2.5 rounded-full text-xs font-black transition-all active:scale-95 shadow-md flex items-center gap-1.5 ${
                    isConnected[selectedConnector.id] 
                      ? 'bg-rose-500 text-white hover:bg-rose-600' 
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isConnected[selectedConnector.id] ? (
                    <>
                      <X size={14} strokeWidth={3} />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Plus size={14} strokeWidth={3} />
                      Sign with Google
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</h3>
                  <p className="text-slate-700 text-sm font-semibold leading-relaxed">
                    {selectedConnector.description}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connection Protocol</h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600 font-mono border border-cyan-100 uppercase">
                      Google OAuth 2.0
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Status</h4>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase ${
                      isConnected[selectedConnector.id] 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-slate-50 text-slate-400 border border-slate-200/50'
                    }`}>
                      {isConnected[selectedConnector.id] ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                </div>

                {LAUNCHABLE_PLUGINS.includes(selectedConnector.id) && isConnected[selectedConnector.id] && (
                  <button 
                    onClick={() => {
                      if (onLaunchPlugin) {
                        onLaunchPlugin(selectedConnector.id);
                        setSelectedConnector(null);
                      }
                    }}
                    className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl transition-all shadow-md active:scale-98"
                  >
                    <ArrowRight size={13} strokeWidth={2.5} />
                    Open {selectedConnector.name} Application
                  </button>
                )}

                <button 
                  onClick={async (e) => {
                    setSelectedConnector(null);
                    setAuthLoading(selectedConnector.id);
                    try {
                      const res = await googleSignIn();
                      if (res) {
                        setIsConnected(prev => ({ ...prev, [selectedConnector.id]: true }));
                        setToast({ message: `Successfully matched Google account: ${res.user.displayName}`, type: 'success' });
                      }
                    } catch (err: any) {
                      setToast({ message: err.message || 'Google Auth cancelled', type: 'error' });
                    } finally {
                      setAuthLoading(null);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all shadow-sm"
                >
                  <Chrome size={14} className="text-slate-950" />
                  Trigger Google Sync Protocol
                </button>

                <p className="text-[11px] leading-relaxed text-slate-400 font-medium text-center">
                  Third-party connectors are fully managed via secure local credentials or Google OAuth. Authorizing allows direct sync into the application workflow.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Area */}
      <div className="p-6 pb-4 border-b border-slate-100/80 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search components or systems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 transition-all text-slate-800"
          />
        </div>
        <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 shrink-0">
           <X size={18} />
        </button>
      </div>

      {/* Content Area - Designed identically with absolute pixel alignment */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        {filteredConnectors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnectors.map((plugin) => (
              <div
                key={plugin.id}
                onClick={() => setSelectedConnector(plugin)}
                className="group flex items-center justify-between p-4.5 rounded-[24px] bg-white border border-slate-200 hover:border-slate-950/80 hover:shadow-xl transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4 min-w-0 pr-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100/50 flex items-center justify-center border border-slate-200/40 shadow-sm shrink-0 group-hover:scale-105 transition-transform animate-fade-in">
                    {plugin.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-950 truncate tracking-tight">{plugin.name}</h4>
                    <p className="text-xs text-slate-400 font-semibold truncate mt-1 leading-normal">{plugin.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {LAUNCHABLE_PLUGINS.includes(plugin.id) && isConnected[plugin.id] && (
                    <button
                      onClick={() => onLaunchPlugin && onLaunchPlugin(plugin.id)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-0.5 transition-all"
                      title={`Launch ${plugin.name}`}
                    >
                      Open
                      <ArrowRight size={10} strokeWidth={3} />
                    </button>
                  )}
                  <button
                    onClick={(e) => toggleConnection(plugin, e)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 border ${
                      isConnected[plugin.id] 
                        ? 'bg-slate-50 border-emerald-150 text-emerald-500' 
                        : 'bg-slate-50 border-slate-200/60 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-400'
                    }`}
                  >
                    {isConnected[plugin.id] ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl min-h-[300px]">
            <LayoutGrid size={48} className="mb-4 opacity-20 text-slate-450" />
            <p className="text-sm font-bold text-slate-600">No integration found matches that query</p>
            <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed max-w-xs text-center">
              Make sure spelling is correct to discover systems.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginsView;
