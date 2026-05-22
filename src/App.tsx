
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  FileCode,
  FileEdit,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Hand,
  Layers,
  LogOut,
  MessageSquare,
  Mic,
  Minus,
  PanelLeft,
  PanelRight,
  Paperclip,
  Save,
  Search,
  Settings,
  Square,
  SquarePen,
  Terminal,
  Trash2,
  X,
  Sparkles,
  ExternalLink,
  Mail,
  Puzzle,
  MoreVertical,
  Pencil,
  Pin,
  Menu,
  Calendar,
  HardDrive,
  Video,
  CheckSquare,
  Presentation,
} from 'lucide-react';

import { AnimatePresence, motion } from 'motion/react';
import LiveAssistant from './LiveAssistant';
import SettingsPage from './components/SettingsPage';
import AuthModal from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import ChatWindow from './components/ChatWindow';
import ProfileMenu from './components/ProfileMenu';
import FileManager from './components/FileManager';
import ImagineView from './components/ImagineView';
import GmailView from './components/GmailView';
import CalendarView from './components/CalendarView';
import DriveView from './components/DriveView';
import MeetView from './components/MeetView';
import PluginsView from './components/PluginsView';
import SearchView from './components/SearchView';
import KeepView from './components/KeepView';
import SlidesView from './components/SlidesView';
import { LiveConfig, AISetting, UserProfile } from './types';
import { MODEL_NAME, MODEL_FLASH_2_0, MODEL_PRO_NAME } from './lib/gemini';
import { initAuth, logout } from './lib/auth';

declare global {
  interface Window {
    electron?: {
      ipcRenderer?: {
        send: (channel: string, data?: unknown) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        invoke: (channel: string, data?: unknown) => Promise<any>;
        removeAllListeners: (channel: string) => void;
      };
    };
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type MenuKey = 'file' | 'edit' | 'view' | 'window' | 'help' | 'model' | null;

interface UploadedAttachment {
  id: string;
  name: string;
  type: string;
  thumbnail?: string;
}

interface PendingAttachment extends UploadedAttachment {
  file: File;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  commands?: string[];
  thinking?: boolean;
  attachments?: UploadedAttachment[];
  feedback?: 'like' | 'dislike';
}

interface ProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface ModelOption {
  id: string;
  name: string;
  apiModel?: string;
  icon: React.ReactNode;
}

const STORAGE_KEY = 'lumax_codex_projects';

const MODEL_OPTIONS: ModelOption[] = [
  { name: 'Gemini 3.5 Flash', id: 'gemini-3.5-flash', apiModel: 'gemini-3.5-flash', icon: <Sparkles size={14} className="text-blue-500" /> },
  { name: 'Gemini 3.1 Pro (Preview)', id: 'gemini-3.1-pro-preview', apiModel: 'gemini-3.1-pro-preview', icon: <Layers size={14} className="text-indigo-500" /> },
  { name: 'Gemini 2.0 Flash', id: 'gemini-2.0-flash', apiModel: 'gemini-2.0-flash', icon: <Sparkles size={14} className="text-violet-500" /> },
];

const STARTER_PROMPTS = [
  'Build a modern dashboard for this project',
  'Debug my Electron app on Windows',
  'Refactor this React code into reusable components',
];

function readStoredProjects(): ProjectRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((project) => project && typeof project.id === 'string');
  } catch (error) {
    console.warn('Failed to read stored projects:', error);
    return [];
  }
}

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function sortProjects(projects: ProjectRecord[]) {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
}

function replaceThinkingMessage(messages: ChatMessage[], replacement: ChatMessage) {
  const nextMessages = [...messages];
  const thinkingIndex = nextMessages.findIndex((message) => message.thinking);
  if (thinkingIndex === -1) {
    nextMessages.push(replacement);
    return nextMessages;
  }
  nextMessages[thinkingIndex] = replacement;
  return nextMessages;
}

function createProject(name: string): ProjectRecord {
  return {
    id: String(Date.now() + Math.random()),
    name,
    updatedAt: Date.now(),
    messages: [],
  };
}

async function fileToInlinePart(file: File) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unable to read attachment.'));
        return;
      }
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read attachment.'));
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data,
      mimeType: file.type || 'application/octet-stream',
    },
  };
}

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left transition-all group ${
        active
          ? 'bg-slate-100 text-slate-900 shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className={`shrink-0 transition-colors ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>{icon}</span>
      <span className="truncate text-[13.5px] font-medium tracking-tight flex-1">{label}</span>
    </button>
  );
}

const CommandCard: React.FC<{ command: string }> = ({ command }) => {
  return (
    <div className="ml-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
        <Terminal size={12} className="text-slate-300" />
        Ran 1 command
      </div>
      <div className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 transition-all hover:border-slate-200">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="truncate font-mono text-[12px] text-slate-600">{command}</span>
        <span className="ml-auto text-[10px] text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">1s</span>
      </div>
    </div>
  );
};

function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  selectedModel,
  models,
  isModelMenuOpen,
  onModelToggle,
  onSelectModel,
  onUploadClick,
  onToggleMic,
  micActive,
  attachments,
  onRemoveAttachment,
  onOpenLive,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  selectedModel: ModelOption;
  models: ModelOption[];
  isModelMenuOpen: boolean;
  onModelToggle: () => void;
  onSelectModel: (model: ModelOption) => void;
  onUploadClick: () => void;
  onToggleMic: () => void;
  micActive: boolean;
  attachments: PendingAttachment[];
  onRemoveAttachment: (id: string) => void;
  onOpenLive: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'inherit';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <div className="relative w-full max-w-3xl overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.07)]">
      {attachments.length ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {attachments.map((attachment) => (
            <span
              key={attachment.id}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-600"
            >
              {attachment.name}
              <button onClick={() => onRemoveAttachment(attachment.id)} className="text-slate-400 transition hover:text-slate-700">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="px-6 pt-5 pb-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Ask Lumax anything. @ to use plugins or mention files"
          className="min-h-10 w-full resize-none bg-transparent text-[15.5px] font-medium leading-relaxed text-slate-800 outline-none placeholder:text-slate-400/80"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-1">
          <button onClick={onUploadClick} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50">
            <Paperclip size={18} />
          </button>
          <button
            onClick={onOpenLive}
            className="rounded-lg p-2 text-cyan-500 hover:bg-cyan-50 transition-all hover:scale-110"
            title="Open Live Voice Assistant"
          >
            <Sparkles size={18} className="animate-pulse" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={onModelToggle}
              className="group flex items-center gap-2.5 rounded-full border border-slate-100/80 bg-slate-50/60 px-3.5 py-2 text-[11.5px] font-bold text-slate-600 transition-all hover:bg-white hover:shadow-md"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100/70 transition-transform group-hover:scale-110">
                {selectedModel.icon}
              </span>
              <span className="tracking-tight">{selectedModel.name}</span>
              <ChevronDown size={12} className={`opacity-40 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isModelMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full right-0 z-[120] mb-3 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_30px_60px_-12px_rgba(15,23,42,0.18)]"
                >
                  <div className="mb-1 border-b border-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Available Models
                  </div>
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => onSelectModel(model)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold transition-all ${
                        selectedModel.id === model.id ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`rounded-lg p-1.5 ${selectedModel.id === model.id ? 'bg-sky-100/60' : 'bg-slate-100/70'}`}>
                        {model.icon}
                      </div>
                      <div className="flex flex-col items-start">
                        <span>{model.name}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            onClick={onToggleMic}
            className={`rounded-lg p-2 transition-all ${
              micActive ? 'bg-rose-50 text-rose-500 animate-pulse' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Mic size={18} />
          </button>

          <button
            onClick={onSubmit}
            disabled={!value.trim() || isLoading}
            className={`ml-1 flex h-9 w-9 items-center justify-center rounded-full transition-all ${
              value.trim() && !isLoading
                ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-700'
                : 'cursor-not-allowed bg-slate-50 text-slate-300'
            }`}
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

const TypewriterText = ({ text = '', speed = 15 }: { text?: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsDone(true);
      return;
    }
    setDisplayedText('');
    setIsDone(false);
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1));
      index++;
      
      // Auto-scroll logic could be handled by parent, but here we can at least ensure this component is visible
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }

      if (index >= text.length) {
        clearInterval(interval);
        setIsDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <div ref={containerRef} className="whitespace-pre-wrap">{displayedText}{!isDone && <span className="inline-block w-1.5 h-4 bg-cyan-400 animate-bounce ml-0.5 align-middle" />}</div>;
};

interface FileItem {
  id: string;
  name: string;
  size: string;
  date: string;
  type: string;
  thumbnail?: string;
  createdBy: 'Me' | 'Grok';
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function App() {
  const viewParam = new URLSearchParams(window.location.search).get('view');
  if (viewParam === 'live') {
    return <LiveAssistant />;
  }

  const [activeView, setActiveView] = useState<'chat' | 'settings' | 'files' | 'imagine' | 'gmail' | 'calendar' | 'drive' | 'meet' | 'plugins' | 'automations' | 'search' | 'keep' | 'slides'>('chat');
  const [isLiveSystemOpen, setIsLiveSystemOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('wardenix_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && 'isLoggedIn' in parsed) {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      email: 'jarvis7007t@gmail.com',
      name: 'Manish Kumar',
      isLoggedIn: true,
    };
  });
  const [config, setConfig] = useState<LiveConfig>({
    model: MODEL_FLASH_2_0,
    voiceName: 'Puck',
    isCameraEnabled: false,
    isScreenEnabled: false,
    isMuted: false,
    isMouseMode: false,
    isDeveloperMode: true,
    aiSettings: [
      { id: 'gemini', name: 'Gemini 2.0 Flash', description: 'High intelligence.', icon: 'sparkles', enabled: true, selectedVersion: MODEL_FLASH_2_0 },
      { id: 'coding', name: 'Coding Agent', description: 'Code expert.', icon: 'code', enabled: true }
    ],
    recordingQuality: 'HD',
    instantShareLink: false,
    highlightMouseCursor: true,
    minimalDock: false,
    useProxyServer: false,
    autoStart: false,
    hardwareAcceleration: true,
    frameRate: 60,
    audioBitrate: 256,
    showWatermark: false,
    countdownTimer: 3,
    showWebcamOverlay: true,
    webcamSize: 180,
    language: 'EN',
    isChatWindowOpen: false,
    customApiKey: localStorage.getItem('GEMINI_API_KEY') || ''
  });

  const [projects, setProjects] = useState<ProjectRecord[]>(() => sortProjects(readStoredProjects()));
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => readStoredProjects()[0]?.id ?? null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[0]);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [micActive, setMicActive] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [globalFiles, setGlobalFiles] = useState<FileItem[]>([
    { id: '1', name: 'image.png', size: '51.78 KB', date: 'May 10', type: 'image/png', createdBy: 'Me' },
    { id: '2', name: 'image.png', size: '76.84 KB', date: 'Apr 12', type: 'image/png', createdBy: 'Me' },
    { id: '3', name: 'image.png', size: '65.68 KB', date: 'Apr 12', type: 'image/png', createdBy: 'Me' },
    { id: '4', name: 'image.png', size: '154.27 KB', date: 'Apr 12', type: 'image/png', createdBy: 'Grok' },
    { id: '5', name: 'image.png', size: '111.22 KB', date: 'Apr 12', type: 'image/png', createdBy: 'Me' },
    { id: '6', name: 'image.png', size: '118.25 KB', date: 'Apr 12', type: 'image/png', createdBy: 'Me' },
  ]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  useEffect(() => {
    // Sync API key from environment if available and not set in localStorage
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && !config.customApiKey) {
      setConfig(prev => ({ ...prev, customApiKey: envKey }));
    }

    // Initialize Auth
    initAuth(
      (user, token) => {
        setUser({
          email: user.email || '',
          name: user.displayName || 'User',
          isLoggedIn: true,
        });
      },
      () => {
        // User not logged in or token missing
      }
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem('wardenix_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeProject?.messages, isLoading]);

  const updateProject = (projectId: string, updater: (project: ProjectRecord) => ProjectRecord) => {
    setProjects((prevProjects) => {
      const nextProjects = prevProjects.map((project) => (project.id === projectId ? updater(project) : project));
      return sortProjects(nextProjects);
    });
  };

  const createNewProject = () => {
    const newProject = createProject(`Untitled Project ${projects.length + 1}`);
    setProjects((prevProjects) => sortProjects([newProject, ...prevProjects]));
    setActiveProjectId(newProject.id);
    setActiveView('chat');
  };

  const deleteProject = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setProjects((prevProjects) => prevProjects.filter((project) => project.id !== projectId));
    if (activeProjectId === projectId) {
      const remaining = projects.filter((project) => project.id !== projectId);
      setActiveProjectId(remaining[0]?.id ?? null);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []) as File[];
    if (!files.length) return;

    const fileAttachments: { id: string; name: string; type: string; file: File; thumbnail?: string }[] = await Promise.all(
      files.map(async (file) => {
        let thumbnail: string | undefined;
        if (file.type.startsWith('image/')) {
          thumbnail = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
        return {
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          file,
          thumbnail,
        };
      })
    );

    const nextAttachments: PendingAttachment[] = fileAttachments.map(({ id, name, type, file, thumbnail }) => ({
      id,
      name,
      type,
      file,
      thumbnail,
    }));
    
    // Also add to global files
    const newFileItems: FileItem[] = fileAttachments.map(item => ({
      id: item.id,
      name: item.name,
      size: formatFileSize(item.file.size),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      type: item.type,
      thumbnail: item.thumbnail,
      createdBy: 'Me'
    }));

    setGlobalFiles(prev => [...newFileItems, ...prev]);
    setPendingAttachments((prev) => [...prev, ...nextAttachments]);
    event.target.value = '';
  };

  const toggleMic = () => {
    if (micActive) {
      recognitionRef.current?.stop?.();
      setMicActive(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onstart = () => setMicActive(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) setInputValue((prev) => `${prev}${prev ? ' ' : ''}${transcript}`);
      };
      recognition.onerror = () => setMicActive(false);
      recognition.onend = () => setMicActive(false);
      recognitionRef.current = recognition;
    }
    recognitionRef.current.start();
  };

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [pinnedProjectIds, setPinnedProjectIds] = useState<string[]>([]);

  const togglePin = (id: string) => {
    setPinnedProjectIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const renameProject = (id: string, newName: string) => {
    updateProject(id, (p) => ({ ...p, name: newName }));
    setEditingProjectId(null);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    let projectId = activeProjectId;
    let isNewProject = false;
    if (!projectId || (activeProject && activeProject.messages.length === 0)) {
      isNewProject = true;
      if (!projectId) {
        const newProject = createProject(text.slice(0, 30) + '...');
        setProjects((prevProjects) => sortProjects([newProject, ...prevProjects]));
        setActiveProjectId(newProject.id);
        projectId = newProject.id;
      } else {
        // Rename existing empty project to something descriptive
        updateProject(projectId, p => ({ ...p, name: text.slice(0, 40) + (text.length > 40 ? '...' : '') }));
      }
    }

    const attachments = pendingAttachments;
    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: attachments.map(({ id, name, type, thumbnail }) => ({ id, name, type, thumbnail })),
    };

    const thinkingMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      thinking: true,
    };

    setInputValue('');
    setPendingAttachments([]);
    setIsLoading(true);

    updateProject(projectId, (project) => ({
      ...project,
      messages: [...project.messages, userMessage, thinkingMessage],
    }));

    try {
      // Prepare history for the server
      const messagesSource = activeProject?.messages || [];
      const chatHistory = messagesSource
        .filter(m => (!m.thinking && m.role !== 'assistant') || (m.role === 'assistant' && m.content && !m.thinking))
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content || '' }]
        }));

      const githubToken = localStorage.getItem('github_token');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: chatHistory.length > 0 ? chatHistory.slice(0, -1) : [],
          model: selectedModel.apiModel || MODEL_NAME,
          githubToken: githubToken || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from server');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.text,
        timestamp: Date.now(),
      };

      updateProject(projectId, (project) => ({
        ...project,
        messages: replaceThinkingMessage(project.messages, assistantMessage),
      }));
    } catch (error: any) {
      console.error(error);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: error.message || 'Error generating response.',
        timestamp: Date.now(),
      };
      updateProject(projectId, (project) => ({
        ...project,
        messages: replaceThinkingMessage(project.messages, assistantMessage),
      }));
    } finally {
      setIsLoading(false);
    }
  };


  if (!user || !user.isLoggedIn) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50/50 p-4 relative overflow-hidden font-sans">
        {/* Animated fluid gradient backdrop */}
        <div className="absolute inset-x-0 top-[-10%] h-[1000px] w-full rounded-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-200/20 via-violet-100/10 to-transparent blur-3xl -z-10" />
        <div className="absolute inset-x-0 bottom-[-10%] h-[1000px] w-full rounded-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-cyan-100/10 via-violet-200/20 to-transparent blur-3xl -z-10" />
        
        <div className="relative z-10 w-full max-w-md">
          <AuthPage 
            onLogin={(u) => setUser(u)} 
            onGuestMode={() => setUser({ email: 'guest@wardenix.ai', name: 'Guest Agent', isLoggedIn: true })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AnimatePresence>
          {isLeftSidebarOpen ? (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white select-none"
            >
              <div className="flex items-center justify-between px-4 py-5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <Sparkles size={18} className="text-cyan-400" />
                  </div>
                  <span className="font-bold tracking-tight">Wardenix AI</span>
                </div>
                <button onClick={() => setIsLeftSidebarOpen(false)} className="text-slate-400">
                  <PanelLeft size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-0.5 mt-2 no-scrollbar">
                 <SidebarItem 
                   icon={<SquarePen size={18} />} 
                   label="New chat" 
                   onClick={createNewProject} 
                   active={activeView === 'chat' && !activeProjectId}
                 />
                 <SidebarItem 
                   icon={<Search size={18} />} 
                   label="Search" 
                   onClick={() => setActiveView('search')}
                   active={activeView === 'search'}
                 />

                  <SidebarItem 
                    icon={<Layers size={18} />}
                    label="Plugins"
                    onClick={() => setActiveView('plugins')}
                    active={activeView === 'plugins'}
                 />
                 <SidebarItem 
                   icon={<Clock size={18} />} 
                   label="Automations" 
                   onClick={() => setActiveView('automations')} 
                   active={activeView === 'automations'}
                 />

                 <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-0.5">
                   <p className="px-3.5 mb-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Workspace</p>
                   <SidebarItem 
                     icon={<Video size={18} className="text-emerald-500" />} 
                     label="Google Meet" 
                     onClick={() => {
                       setActiveView('meet');
                       setActiveProjectId(null);
                     }} 
                     active={activeView === 'meet'}
                   />
                   <SidebarItem 
                     icon={<Mail size={18} className="text-[#EA4335]" />} 
                     label="Gmail" 
                     onClick={() => {
                       setActiveView('gmail');
                       setActiveProjectId(null);
                     }} 
                     active={activeView === 'gmail'}
                   />
                   <SidebarItem 
                     icon={<Calendar size={18} className="text-[#4285F4]" />} 
                     label="Google Calendar" 
                     onClick={() => {
                       setActiveView('calendar');
                       setActiveProjectId(null);
                     }} 
                     active={activeView === 'calendar'}
                   />
                   <SidebarItem 
                     icon={<HardDrive size={18} className="text-amber-500" />} 
                     label="Google Drive" 
                     onClick={() => {
                       setActiveView('drive');
                       setActiveProjectId(null);
                     }} 
                     active={activeView === 'drive'}
                    />
                    <SidebarItem 
                      icon={<Presentation size={18} className="text-amber-605 text-amber-600" />} 
                      label="Google Slides" 
                      onClick={() => {
                        setActiveView('slides');
                        setActiveProjectId(null);
                      }} 
                      active={activeView === 'slides'}
                    />
                    <SidebarItem 
                      icon={<CheckSquare size={18} className="text-amber-500" />} 
                      label="Google Keep (Secure)" 
                      onClick={() => {
                        setActiveView('keep');
                        setActiveProjectId(null);
                      }} 
                      active={activeView === 'keep'}
                   />
                 </div>

                  <div className="mt-6 space-y-1">
                     {[...projects].sort((a, b) => {
                       const aPinned = pinnedProjectIds.includes(a.id);
                       const bPinned = pinnedProjectIds.includes(b.id);
                       if (aPinned && !bPinned) return -1;
                       if (!aPinned && bPinned) return 1;
                       return b.updatedAt - a.updatedAt;
                     }).map((p) => (
                       <div
                         key={p.id}
                         className="relative group"
                       >
                         <button
                           onClick={() => {
                             setActiveProjectId(p.id);
                             setActiveView('chat');
                           }}
                           className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left transition-all ${
                             activeProjectId === p.id && activeView === 'chat' 
                               ? 'bg-slate-100 text-slate-900 shadow-sm' 
                               : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                           }`}
                         >
                           <MessageSquare size={16} className={`shrink-0 transition-colors ${activeProjectId === p.id && activeView === 'chat' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`} />
                           {editingProjectId === p.id ? (
                             <input
                               autoFocus
                               value={editName}
                               onChange={(e) => setEditName(e.target.value)}
                               onBlur={() => renameProject(p.id, editName)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') renameProject(p.id, editName);
                                 if (e.key === 'Escape') setEditingProjectId(null);
                               }}
                               className="flex-1 bg-white border border-slate-200 rounded px-1 text-[13px] outline-none"
                               onClick={(e) => e.stopPropagation()}
                             />
                           ) : (
                             <div className="flex flex-1 min-w-0 items-center justify-between">
                               <span className="truncate text-[13px] font-medium">{p.name}</span>
                               {pinnedProjectIds.includes(p.id) && (
                                 <Pin size={10} className="text-slate-400 shrink-0 rotate-45" />
                               )}
                             </div>
                           )}
                           
                           <div 
                             onClick={(e) => {
                               e.stopPropagation();
                               setActiveMenuId(activeMenuId === p.id ? null : p.id);
                             }} 
                             className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                           >
                              <Menu size={14} />
                           </div>
                         </button>

                         <AnimatePresence>
                           {activeMenuId === p.id && (
                             <>
                               <div 
                                 className="fixed inset-0 z-40" 
                                 onClick={() => setActiveMenuId(null)} 
                               />
                               <motion.div
                                 initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                 animate={{ opacity: 1, scale: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                 className="absolute right-2 top-full mt-1 z-50 bg-[#F4F4F4] border border-white/40 rounded-2xl shadow-2xl p-1.5 min-w-[170px] backdrop-blur-xl"
                               >
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     window.open(window.location.href, '_blank');
                                     setActiveMenuId(null);
                                   }}
                                   className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-white/50 rounded-xl transition-all"
                                 >
                                   <ExternalLink size={14} className="text-slate-400" />
                                   Open new tab
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setEditingProjectId(p.id);
                                     setEditName(p.name);
                                     setActiveMenuId(null);
                                   }}
                                   className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-white/50 rounded-xl transition-all"
                                 >
                                   <Pencil size={14} className="text-slate-400" />
                                   Rename
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     togglePin(p.id);
                                     setActiveMenuId(null);
                                   }}
                                   className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-white/50 rounded-xl transition-all"
                                 >
                                   <Pin size={14} className="text-slate-400" />
                                   {pinnedProjectIds.includes(p.id) ? 'Unpin' : 'Pin'}
                                 </button>
                                 <div className="h-[1px] bg-slate-200/50 my-1 mx-2" />
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     deleteProject(p.id, e);
                                     setActiveMenuId(null);
                                   }}
                                   className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-red-500 hover:bg-white/50 rounded-xl transition-all"
                                 >
                                   <Trash2 size={14} className="text-red-400" />
                                   Delete
                                 </button>
                               </motion.div>
                             </>
                           )}
                         </AnimatePresence>
                       </div>
                     ))}
                 </div>
              </div>

              <ProfileMenu 
                user={user} 
                onSettingsClick={() => setActiveView('settings')}
                onFilesClick={() => setActiveView('files')}
                onLogout={async () => {
                  await logout();
                  setUser({ email: '', name: '', isLoggedIn: false });
                  setActiveView('chat');
                }}
              />
            </motion.aside>
          ) : null}
        </AnimatePresence>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden relative">
          {!isLeftSidebarOpen && (
            <button onClick={() => setIsLeftSidebarOpen(true)} className="absolute top-4 left-4 z-50 p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
              <PanelLeft size={20} />
            </button>
          )}

          {activeView === 'settings' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <SettingsPage 
                config={config} 
                setConfig={setConfig} 
                onLoginClick={() => setIsAuthOpen(true)}
              />
            </div>
          ) : activeView === 'files' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <FileManager 
                files={globalFiles}
                onClose={() => setActiveView('chat')} 
                onDelete={(id) => setGlobalFiles(prev => prev.filter(f => f.id !== id))}
              />
            </div>
          ) : activeView === 'imagine' ? (
            <ImagineView onClose={() => setActiveView('chat')} />
          ) : activeView === 'gmail' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <GmailView onClose={() => setActiveView('chat')} />
            </div>
          ) : activeView === 'calendar' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <CalendarView onClose={() => setActiveView('chat')} />
            </div>
          ) : activeView === 'drive' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <DriveView onClose={() => setActiveView('chat')} />
            </div>
          ) : activeView === 'slides' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <SlidesView onClose={() => setActiveView('chat')} />
            </div>
          ) : activeView === 'keep' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <KeepView onClose={() => setActiveView('chat')} />
            </div>
          ) : activeView === 'meet' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <MeetView onClose={() => setActiveView('chat')} />
            </div>
          ) : activeView === 'plugins' ? (
            <div className="flex-1 overflow-hidden bg-white">
              <PluginsView 
                user={user}
                onClose={() => setActiveView('chat')} 
                onUserUpdate={(u) => setUser(u)}
              />
            </div>
          ) : activeView === 'automations' ? (
            <div className="flex-1 overflow-hidden bg-white flex flex-col items-center justify-center p-8">
               <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                 <Clock size={32} />
               </div>
               <h2 className="text-xl font-bold text-slate-900 mb-2">Automations</h2>
               <p className="text-slate-500 font-medium text-center max-w-sm">
                 Create and manage your automated workflows. This feature is coming soon to Wardenix AI.
               </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden relative">
               <SearchView 
                 projects={projects} 
                 isOpen={activeView === 'search'}
                 onClose={() => setActiveView('chat')} 
                 onSelectProject={(id) => {
                   setActiveProjectId(id);
                   setActiveView('chat');
                 }}
                 onEditProject={(id) => {
                   setEditingProjectId(id);
                   const proj = projects.find(p => p.id === id);
                   if (proj) setEditName(proj.name);
                   setActiveView('chat');
                 }}
                 onDeleteProject={(id) => {
                   setProjects(prev => prev.filter(p => p.id !== id));
                 }}
               />
               {!activeProject || activeProject.messages.length === 0 ? (
                 <div className="flex flex-1 flex-col items-center justify-center p-6">
                    <div className="relative mb-6">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1] }} 
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full" 
                      />
                      <Sparkles size={64} className="text-slate-900 relative z-10" />
                    </div>
                    <h1 className="text-2xl font-bold mb-4 tracking-tight">How can I help you today?</h1>
                    <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-lg">
                      {STARTER_PROMPTS.map(p => (
                        <button key={p} onClick={() => setInputValue(p)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium hover:border-slate-400 hover:shadow-sm transition-all">
                          {p}
                        </button>
                      ))}
                    </div>
                 </div>
               ) : (
                 <div ref={scrollRef} className="flex-1 overflow-y-auto pt-12 pb-24 px-6 md:px-12">
                    <div className="max-w-3xl mx-auto space-y-8">
                       {activeProject.messages.map((m, i) => {
                         const isLast = i === activeProject.messages.length - 1;
                         
                         if (m.role === 'user') {
                           return (
                             <div key={i} className="flex flex-col items-end mb-8">
                               {m.attachments && m.attachments.length > 0 && (
                                 <div className="flex flex-wrap justify-end gap-2 mb-2 max-w-[85%]">
                                   {m.attachments.map((att) => (
                                     <div 
                                       key={att.id} 
                                       onClick={() => att.thumbnail && setLightboxImage(att.thumbnail)}
                                       className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-slate-400 transition-all active:scale-95"
                                     >
                                       {att.thumbnail ? (
                                         <img src={att.thumbnail} alt={att.name} className="w-32 h-32 object-cover" />
                                       ) : (
                                         <div className="w-32 h-32 flex flex-col items-center justify-center p-3 text-slate-400 bg-slate-50">
                                           <Paperclip size={24} className="mb-2" />
                                           <span className="text-[10px] text-center font-medium line-clamp-2">{att.name}</span>
                                         </div>
                                       )}
                                     </div>
                                   ))}
                                 </div>
                               )}
                               <div className="p-4 rounded-2xl max-w-[85%] bg-slate-100 text-slate-800 ring-1 ring-slate-200/50">
                                  <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</div>
                               </div>
                             </div>
                           );
                         }
                         
                         return (
                           <div key={i} className="flex justify-start items-start gap-4 mb-10">
                              <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                                 <Sparkles size={16} className="text-cyan-500" />
                              </div>
                              <div className="max-w-[85%] pt-1">
                                 {m.thinking ? (
                                   <div className="flex gap-1.5 mt-2">
                                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                   </div>
                                 ) : (
                                   <div className="text-[15px] leading-relaxed text-slate-800">
                                      {isLast ? <TypewriterText text={m.content} /> : <div className="whitespace-pre-wrap">{m.content}</div>}
                                   </div>
                                 )}
                              </div>
                           </div>
                         );
                       })}
                    </div>
                 </div>
               )}

               <div className="absolute bottom-8 left-0 right-0 px-6">
                  <div className="max-w-3xl mx-auto">
                     <ChatInput
                       value={inputValue}
                       onChange={setInputValue}
                       onSubmit={handleSend}
                       isLoading={isLoading}
                       selectedModel={selectedModel}
                       models={MODEL_OPTIONS}
                       isModelMenuOpen={openMenu === 'model'}
                       onModelToggle={() => setOpenMenu(prev => prev === 'model' ? null : 'model')}
                       onSelectModel={(m) => { setSelectedModel(m); setOpenMenu(null); }}
                       onUploadClick={() => fileInputRef.current?.click()}
                       onToggleMic={toggleMic}
                       micActive={micActive}
                       attachments={pendingAttachments}
                       onRemoveAttachment={(id) => setPendingAttachments(p => p.filter(a => a.id !== id))}
                       onOpenLive={() => setIsLiveSystemOpen(prev => !prev)}
                     />
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {isLiveSystemOpen && (
          <div className="fixed inset-0 z-[40] pointer-events-none flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="pointer-events-auto"
            >
              <LiveAssistant onClose={() => setIsLiveSystemOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ChatWindow 
        isOpen={config.isChatWindowOpen}
        onClose={() => setConfig(prev => ({ ...prev, isChatWindowOpen: false }))}
        isConnected={false}
        onSendMessage={(text) => {
          setInputValue(text);
        }}
        onSpeak={(text) => {
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
        }}
      />

      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={(u) => setUser(u)}
      />

      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[200] bg-slate-950/40 backdrop-blur-2xl flex items-center justify-center p-4 cursor-pointer"
          >
            <button className="absolute top-8 right-8 p-3 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-[90vw] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={lightboxImage} 
                alt="Fullscreen Preview" 
                className="w-full h-full object-contain bg-slate-900/10"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
