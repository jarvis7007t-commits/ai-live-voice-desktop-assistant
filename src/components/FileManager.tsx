import React, { useState, useMemo, useRef } from 'react';
import { 
  Trash2, 
  Search, 
  ListFilter, 
  ArrowDownUp, 
  X, 
  Check,
  Zap,
  Sparkles,
  FileImage,
  FileVideo,
  FileText,
  FileCode,
  FilePieChart,
  File as FileIcon,
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  Upload,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileItem {
  id: string;
  name: string;
  size: string;
  date: string;
  type: string;
  thumbnail?: string;
  createdBy: 'Me' | 'Grok';
}

interface FileManagerProps {
  files: FileItem[];
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUpload?: (newFiles: FileItem[]) => void;
}

const getFileIcon = (type: string, thumbnail?: string, name?: string, id?: string) => {
  let resolvedUrl = thumbnail;
  if (id && typeof window !== 'undefined' && (window as any).__fileObjectUrls?.[id]) {
    resolvedUrl = (window as any).__fileObjectUrls[id];
  }

  if (resolvedUrl && type.toLowerCase().startsWith('image/')) {
    return <img src={resolvedUrl} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />;
  }
  const lowerType = type.toLowerCase();
  const lowerName = (name || '').toLowerCase();
  
  if (lowerType.startsWith('image/')) {
    return <FileImage size={24} className="text-blue-500" />;
  }
  if (lowerType.startsWith('video/')) {
    return <FileVideo size={24} className="text-rose-500" />;
  }
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return <FileText size={24} className="text-red-500" />;
  }
  if (lowerType.includes('sheet') || lowerType.includes('csv') || lowerType.includes('excel') || lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx')) {
    return <FilePieChart size={24} className="text-emerald-500" />;
  }
  if (
    lowerType.includes('javascript') || 
    lowerType.includes('typescript') || 
    lowerType.includes('json') || 
    lowerType.includes('html') || 
    lowerType.includes('coding') ||
    lowerType.includes('css') || 
    lowerType.includes('code') ||
    lowerName.endsWith('.js') || lowerName.endsWith('.ts') || lowerName.endsWith('.tsx') || lowerName.endsWith('.jsx') || lowerName.endsWith('.py') || lowerName.endsWith('.json')
  ) {
    return <FileCode size={24} className="text-amber-500" />;
  }
  if (lowerType.includes('text') || lowerType.includes('doc') || lowerType.includes('word') || lowerType.includes('office') || lowerName.endsWith('.txt') || lowerName.endsWith('.docx')) {
    return <FileText size={24} className="text-indigo-500" />;
  }
  return <FileIcon size={24} className="text-slate-400" />;
};

const getFileUrl = (file: FileItem): string | undefined => {
  if (typeof window !== 'undefined' && (window as any).__fileObjectUrls?.[file.id]) {
    return (window as any).__fileObjectUrls[file.id] || undefined;
  }
  return file.thumbnail || undefined;
};

const FileManager: React.FC<FileManagerProps> = ({ files, onClose, onDelete, onUpload }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{type?: string, owner?: string}>({});
  const [sortBy, setSortBy] = useState('Last Used Time');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');

  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const newUploadedItems: FileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      let thumbnail: string | undefined;

      if (file.type.startsWith('image/')) {
        thumbnail = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      }

      const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const idx = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, idx)).toFixed(2)) + ' ' + sizes[idx];
      };

      newUploadedItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: formatFileSize(file.size),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        type: file.type || 'application/octet-stream',
        thumbnail,
        createdBy: 'Me'
      });
    }

    if (onUpload) {
      onUpload(newUploadedItems);
    }
    
    // Reset file input
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOwner = !activeFilter.owner || f.createdBy === activeFilter.owner;
      
      let matchesType = true;
      if (activeFilter.type) {
        if (activeFilter.type === 'Images') matchesType = f.type.startsWith('image/');
        else if (activeFilter.type === 'Videos') matchesType = f.type.startsWith('video/');
        else if (activeFilter.type === 'Documents') matchesType = f.type.includes('text') || f.type.includes('doc');
        else if (activeFilter.type === 'Spreadsheets') matchesType = f.type.includes('sheet') || f.type.includes('csv');
        else if (activeFilter.type === 'Code') matchesType = f.type.includes('javascript') || f.type.includes('typescript') || f.type.includes('json');
        else if (activeFilter.type === 'PDF') matchesType = f.type.includes('pdf');
      }
      
      return matchesSearch && matchesOwner && matchesType;
    });
  }, [files, searchQuery, activeFilter]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedFiles.map(f => f.id)));
    }
  };

  const deleteSelected = () => {
    selectedIds.forEach(id => onDelete?.(id));
    setSelectedIds(new Set());
  };

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      if (sortBy === 'Name') return a.name.localeCompare(b.name);
      if (sortBy === 'Size') {
        const parseSize = (s: string) => {
          const [val, unit] = s.split(' ');
          const n = parseFloat(val);
          if (unit === 'GB') return n * 1024 * 1024 * 1024;
          if (unit === 'MB') return n * 1024 * 1024;
          if (unit === 'KB') return n * 1024;
          return n;
        };
        return parseSize(b.size) - parseSize(a.size);
      }
      // Date and Last Used Time use same logic for now as we only have one date string
      const parseDate = (dStr: string) => {
        const parsed = Date.parse(dStr);
        return isNaN(parsed) ? 0 : parsed;
      };
      return parseDate(b.date) - parseDate(a.date);
    });
  }, [filteredFiles, sortBy]);

  const currentPathNormalized = currentPath ? (currentPath.endsWith('/') ? currentPath : currentPath + '/') : '';

  const directoryContents = useMemo(() => {
    const isSearchingOrFiltering = searchQuery || activeFilter.type || activeFilter.owner;
    
    if (isSearchingOrFiltering) {
      return {
        subfolders: [] as string[],
        files: sortedFiles
      };
    }

    const subdirs = new Set<string>();
    const directFiles: FileItem[] = [];

    sortedFiles.forEach(f => {
      const name = f.name;
      if (currentPath === '') {
        const idx = name.indexOf('/');
        if (idx === -1) {
          directFiles.push(f);
        } else {
          subdirs.add(name.substring(0, idx));
        }
      } else {
        if (name.startsWith(currentPathNormalized)) {
          const remainder = name.substring(currentPathNormalized.length);
          const idx = remainder.indexOf('/');
          if (idx === -1) {
            directFiles.push(f);
          } else {
            subdirs.add(remainder.substring(0, idx));
          }
        }
      }
    });

    return {
      subfolders: Array.from(subdirs).sort((a, b) => a.localeCompare(b)),
      files: directFiles
    };
  }, [sortedFiles, currentPath, currentPathNormalized, searchQuery, activeFilter]);

  return (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-[32px] text-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/40">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <button 
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Upload size={14} />
            <span>Upload File</span>
          </button>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
           <X size={20} />
        </button>
        <input 
          type="file" 
          ref={uploadInputRef} 
          onChange={handleFileInputChange} 
          multiple 
          className="hidden" 
          accept="image/*,video/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.csv,.tsv,.json,.js,.ts,.tsx,.py"
        />
      </div>

      {/* Action Bar */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                selectedIds.size === sortedFiles.length && sortedFiles.length > 0
                  ? 'bg-slate-900 border-slate-900' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
               {(selectedIds.size === sortedFiles.length && sortedFiles.length > 0) && <Check size={14} className="text-white" />}
               {(selectedIds.size > 0 && selectedIds.size < sortedFiles.length) && <div className="w-2.5 h-0.5 bg-slate-400 rounded-full" />}
            </button>
            <span className="text-sm font-semibold text-slate-500 select-none">
              {selectedIds.size} selected
            </span>
          </div>

          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={deleteSelected}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-100 text-red-500 hover:bg-red-50 transition-all text-xs font-bold"
              >
                <Trash2 size={12} />
                Delete
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 pr-4 py-2 bg-slate-100/60 border border-transparent rounded-full text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 w-48 transition-all focus:w-64 placeholder:text-slate-400"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-bold ${isFilterOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <ListFilter size={16} />
              Filter
              {isFilterOpen && <X size={14} className="ml-1 opacity-60" />}
            </button>
            
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] z-50 p-1.5"
                >
                  <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created By</div>
                  <button 
                    onClick={() => setActiveFilter(prev => ({ ...prev, owner: prev.owner === 'Me' ? undefined : 'Me' }))}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] text-white">M</div>
                    <span>Me</span>
                    {activeFilter.owner === 'Me' && <Check size={14} className="ml-auto text-slate-900" />}
                  </button>
                  <button 
                    onClick={() => setActiveFilter(prev => ({ ...prev, owner: prev.owner === 'Grok' ? undefined : 'Grok' }))}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white">
                      <Sparkles size={11} />
                    </div>
                    <span>Grok</span>
                    {activeFilter.owner === 'Grok' && <Check size={14} className="ml-auto text-slate-900" />}
                  </button>

                  <div className="h-px bg-slate-100 my-1 mx-2" />
                  
                  <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">File Type</div>
                  {[
                    { icon: <FileImage size={15} />, label: 'Images' },
                    { icon: <FileVideo size={15} />, label: 'Videos' },
                    { icon: <FileText size={15} />, label: 'Documents' },
                    { icon: <FilePieChart size={15} />, label: 'Spreadsheets' },
                    { icon: <FileCode size={15} />, label: 'Code' },
                    { icon: <FileIcon size={15} />, label: 'PDF' },
                  ].map(type => (
                    <button 
                      key={type.label} 
                      onClick={() => setActiveFilter(prev => ({ ...prev, type: prev.type === type.label ? undefined : type.label }))}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      <span className="text-slate-400">{type.icon}</span>
                      <span className="flex-1 text-left">{type.label}</span>
                      {activeFilter.type === type.label && <Check size={14} className="text-slate-900" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-bold ${isSortOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <ArrowDownUp size={16} />
              Sort
            </button>
            
            <AnimatePresence>
              {isSortOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-1.5"
                >
                  {['Size', 'Name', 'Created Time', 'Last Used Time'].map(option => (
                    <button 
                      key={option}
                      onClick={() => { setSortBy(option); setIsSortOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      <span>{option}</span>
                      {sortBy === option && <Check size={14} className="text-slate-900" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Breadcrumbs (only when not searching/filtering) */}
      {!searchQuery && !activeFilter.type && !activeFilter.owner && (
        <div className="px-6 py-2.5 bg-slate-50/50 flex items-center gap-1.5 border-b border-slate-100 overflow-x-auto text-[13px] font-bold text-slate-500">
          <button 
            onClick={() => setCurrentPath('')}
            className="flex items-center gap-1 hover:text-slate-900 transition-colors py-1 px-1.5 rounded hover:bg-slate-100/60 shrink-0"
          >
            <Home size={14} />
            <span>Files</span>
          </button>
          {currentPath.split('/').filter(Boolean).map((segment, idx, arr) => {
            const pathUpToSegment = arr.slice(0, idx + 1).join('/');
            return (
              <React.Fragment key={pathUpToSegment}>
                <ChevronRight size={12} className="text-slate-350 shrink-0" />
                <button 
                  onClick={() => setCurrentPath(pathUpToSegment)}
                  className="hover:text-slate-900 transition-colors py-1 px-1.5 rounded hover:bg-slate-100/60 truncate max-w-[120px] shrink-0"
                >
                  {segment}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
        {/* Render Folders (only in browse mode, which means subdir is populated when not searching/filtering) */}
        {directoryContents.subfolders.map((folderName) => {
          const folderPath = currentPath === '' ? folderName : `${currentPath}/${folderName}`;
          return (
            <div 
              key={folderPath}
              onClick={() => setCurrentPath(folderPath)}
              className="group flex items-center gap-4 p-3 rounded-2xl border bg-white border-slate-100 hover:border-slate-300 transition-all cursor-pointer select-none"
            >
              <div className="w-5 h-5 rounded border-2 border-transparent flex items-center justify-center shrink-0" />
              
              <div className="w-14 h-14 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-center shrink-0">
                <Folder size={24} className="text-amber-500 fill-amber-500/10 group-hover:scale-110 transition-transform" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-950 truncate tracking-tight">{folderName}</h3>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Folder • Click to open
                </div>
              </div>
              
              <ChevronRight size={16} className="text-slate-350 group-hover:text-slate-500 transition-colors mr-1" />
            </div>
          );
        })}

        {/* Render Files */}
        {directoryContents.files.map((file) => {
          const isSearchingOrFiltering = searchQuery || activeFilter.type || activeFilter.owner;
          const displayName = isSearchingOrFiltering 
            ? file.name 
            : (file.name.includes('/') ? file.name.substring(file.name.lastIndexOf('/') + 1) : file.name);

          return (
            <div 
              key={file.id}
              onClick={() => {
                setPreviewFile(file);
              }}
              className={`group flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedIds.has(file.id) 
                  ? 'bg-slate-50 border-slate-900 shadow-sm' 
                  : 'bg-white border-slate-100 hover:border-slate-300'
              }`}
            >
              <div 
                onClick={(e) => toggleSelect(file.id, e)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                  selectedIds.has(file.id) ? 'bg-slate-900 border-slate-900' : 'border-slate-300 group-hover:border-slate-400'
                }`}
              >
                {selectedIds.has(file.id) && <Check size={14} className="text-white" />}
              </div>
              
              <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                {getFileIcon(file.type, file.thumbnail, file.name, file.id)}
              </div>

              <div className="flex-1 min-w-0">
                 <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">{displayName}</h3>
                 <div className="flex items-center gap-2 text-[12px] font-medium text-slate-400 truncate">
                    <span>{file.size}</span>
                    <span>•</span>
                    <span>{file.date}</span>
                    <span>•</span>
                    <span>{file.type}</span>
                    {isSearchingOrFiltering && file.name.includes('/') && (
                      <>
                        <span>•</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate bg-slate-100 px-1.5 py-0.5 rounded">
                          {file.name.substring(0, file.name.lastIndexOf('/'))}
                        </span>
                      </>
                    )}
                 </div>
              </div>
            </div>
          );
        })}

        {directoryContents.subfolders.length === 0 && directoryContents.files.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Search size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-medium">No contents in this directory</p>
          </div>
        )}
      </div>
      {/* Fullscreen Image Preview */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-[200] bg-slate-950/40 backdrop-blur-2xl flex items-center justify-center p-4 cursor-pointer"
          >
            <button className="absolute top-8 right-8 p-3 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-[90vw] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={fullscreenImage || undefined} 
                alt="Fullscreen Preview" 
                className="w-full h-full object-contain bg-slate-900/10"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Detail Overlay */}
      <AnimatePresence>
        {previewFile && (() => {
          const isLargePreview = previewFile.type.startsWith('video/') || previewFile.type.includes('pdf') || previewFile.name.toLowerCase().endsWith('.pdf');
          return (
            <div className="fixed inset-0 z-[100] bg-slate-950/30 backdrop-blur-xl flex items-center justify-center p-4">
               <motion.div
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className={`w-full ${isLargePreview ? 'max-w-4xl' : 'max-w-xl'} bg-white/90 backdrop-blur-[40px] rounded-[32px] shadow-2xl overflow-hidden relative border border-white/30`}
               >
                  <div className="absolute top-6 right-8 z-10">
                    <button onClick={() => setPreviewFile(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="w-full p-6 md:p-8 flex flex-col items-center">
                    {/* File Metadata Header */}
                    <div className="flex flex-col items-center text-center mb-6 w-full px-4 mt-4">
                      <h2 className="text-xl font-bold text-slate-900 truncate max-w-full leading-tight">{previewFile.name}</h2>
                      <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{previewFile.size} • {previewFile.type || 'Document'}</p>
                    </div>

                    {/* Dynamic Viewer */}
                    <div className="w-full flex justify-center items-center">
                      {previewFile.type.startsWith('image/') ? (
                        <div className="w-full max-h-[55vh] rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center relative group/preview">
                           <img 
                             src={getFileUrl(previewFile)} 
                             alt={previewFile.name} 
                             className="max-w-full max-h-[55vh] object-contain cursor-zoom-in rounded-xl"
                             onClick={() => setFullscreenImage(getFileUrl(previewFile))}
                           />
                           <div className="absolute bottom-4 right-4 opacity-0 group-hover/preview:opacity-100 transition-opacity bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none font-bold">
                             Click to zoom
                           </div>
                        </div>
                      ) : previewFile.type.includes('pdf') || previewFile.name.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-full h-[60vh] rounded-2xl border border-slate-200/60 overflow-hidden bg-white shadow-inner relative flex flex-col">
                           <iframe 
                             src={getFileUrl(previewFile)} 
                             className="w-full h-full border-none rounded-2xl"
                             title={previewFile.name}
                           />
                        </div>
                      ) : previewFile.type.startsWith('video/') ? (
                        <div className="w-full max-h-[55vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 shadow-lg relative">
                           <video 
                             src={getFileUrl(previewFile)} 
                             controls 
                             autoPlay
                             className="w-full max-h-[55vh] object-contain rounded-xl"
                           />
                        </div>
                      ) : previewFile.type.includes('sheet') || previewFile.type.includes('csv') || previewFile.type.includes('excel') || previewFile.name.toLowerCase().endsWith('.csv') || previewFile.name.toLowerCase().endsWith('.xlsx') ? (
                        <div className="w-full py-12 rounded-2xl border border-slate-150 bg-slate-50/50 flex flex-col items-center justify-center px-8 text-center">
                           <FilePieChart size={56} className="text-emerald-500 mb-4 animate-bounce" />
                           <span className="text-sm font-bold text-slate-800 mb-1">Spreadsheet Document</span>
                           <p className="text-xs text-slate-400 max-w-sm mb-6">Preview of interactive sheets is supported via download. Click below to open in Excel or Sheets.</p>
                           <a 
                             href={getFileUrl(previewFile)} 
                             download={previewFile.name}
                             className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition-all shadow hover:shadow-md inline-flex items-center gap-2"
                           >
                             <Download size={14} />
                             <span>Download Spreadsheet</span>
                           </a>
                        </div>
                      ) : (
                        <div className="w-full py-12 rounded-2xl border border-slate-150 bg-slate-50/50 flex flex-col items-center justify-center px-8 text-center">
                           <FileIcon size={56} className="text-slate-400 mb-4" />
                           <span className="text-sm font-bold text-slate-800 mb-1">Generic Document</span>
                           <p className="text-xs text-slate-400 max-w-sm mb-6 font-medium">Interactive preview is not supported for {previewFile.type} type. Download file below to open locally.</p>
                           <a 
                             href={getFileUrl(previewFile)} 
                             download={previewFile.name}
                             className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-full text-xs font-bold transition-all shadow hover:shadow-md inline-flex items-center gap-2"
                           >
                             <Download size={14} />
                             <span>Download File</span>
                           </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="px-8 py-5 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] text-white font-bold">M</div>
                        <span className="text-xs font-bold text-slate-650">Uploaded by Me</span>
                     </div>
                     <div className="flex items-center gap-3">
                       {onDelete && (
                         <button 
                           onClick={() => {
                             onDelete(previewFile.id);
                             setPreviewFile(null);
                           }}
                           className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-650 rounded-full text-xs font-bold transition-all"
                         >
                           <Trash2 size={13} />
                           <span>Delete</span>
                         </button>
                       )}
                       <a 
                         href={getFileUrl(previewFile)} 
                         download={previewFile.name}
                         className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-full text-xs font-bold transition-all shadow-md active:scale-95"
                       >
                         <Download size={13} />
                         <span>Download file</span>
                       </a>
                     </div>
                  </div>
               </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default FileManager;
