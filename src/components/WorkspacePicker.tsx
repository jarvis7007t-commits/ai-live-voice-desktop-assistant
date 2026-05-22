import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  File, 
  FileText, 
  FileSpreadsheet, 
  Presentation as PresentationIcon, 
  Folder, 
  Clock, 
  Loader2, 
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAccessToken } from '../lib/auth';

export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

interface WorkspacePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: PickedFile) => void;
  allowedTypes?: 'all' | 'slides' | 'docs' | 'sheets';
  title?: string;
}

const WorkspacePicker: React.FC<WorkspacePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  allowedTypes = 'all',
  title = 'Select Workspace File'
}) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFileObj, setSelectedFileObj] = useState<PickedFile | null>(null);

  // Filter state
  const [currentFilter, setCurrentFilter] = useState<'all' | 'slides' | 'docs' | 'sheets'>(allowedTypes);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Please sign in to Google to browse files.');
        setLoading(false);
        return;
      }

      // Build mimeType query criteria
      let q = "trashed = false";
      if (currentFilter === 'slides') {
        q += " and mimeType = 'application/vnd.google-apps.presentation'";
      } else if (currentFilter === 'docs') {
        q += " and mimeType = 'application/vnd.google-apps.document'";
      } else if (currentFilter === 'sheets') {
        q += " and mimeType = 'application/vnd.google-apps.spreadsheet'";
      } else {
        // any workspace documents
        q += " and (mimeType = 'application/vnd.google-apps.presentation' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.folder')";
      }

      // Add search term if exists
      if (searchTerm.trim()) {
        const escapedSearch = searchTerm.replace(/'/g, "\\'");
        q += ` and name contains '${escapedSearch}'`;
      }

      const encodedQ = encodeURIComponent(q);
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodedQ}&pageSize=60&fields=files(id,name,mimeType,modifiedTime,thumbnailLink,iconLink,webViewLink)&orderBy=modifiedTime%20desc`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error('Google Drive access failed. Re-authenticate and try again.');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve Drive files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setSelectedFileId(null);
      setSelectedFileObj(null);
    }
  }, [isOpen, currentFilter, searchTerm]);

  const handleSelectItem = (file: any) => {
    setSelectedFileId(file.id);
    setSelectedFileObj({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      thumbnailLink: file.thumbnailLink
    });
  };

  const handleConfirmSelection = () => {
    if (selectedFileObj) {
      onSelect(selectedFileObj);
      onClose();
    }
  };

  const getMimeIcon = (mimeType: string) => {
    if (mimeType.includes('presentation')) {
      return <PresentationIcon className="text-amber-500 shrink-0" size={17} />;
    }
    if (mimeType.includes('spreadsheet')) {
      return <FileSpreadsheet className="text-emerald-500 shrink-0" size={17} />;
    }
    if (mimeType.includes('document')) {
      return <FileText className="text-blue-500 shrink-0" size={17} />;
    }
    if (mimeType.includes('folder')) {
      return <Folder className="text-slate-400 shrink-0" size={17} />;
    }
    return <File className="text-slate-500 shrink-0" size={17} />;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="google-picker-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-3xl bg-white rounded-[24px] border border-slate-200 shadow-2xl flex flex-col h-[580px] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-50 border border-amber-100 text-amber-500 rounded-lg flex items-center justify-center font-bold">
                G
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-950">{title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Drive File Directory</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          {/* Subheader Search and Filter */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search files in your Google Drive..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-250 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 text-slate-800"
                />
              </div>

              {/* Mime filters */}
              {allowedTypes === 'all' && (
                <div className="flex items-center gap-1 bg-slate-200/50 rounded-xl p-1 border border-slate-250/30">
                  {(['all', 'slides', 'docs', 'sheets'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setCurrentFilter(filter)}
                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                        currentFilter === filter
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Files container */}
          <div className="flex-1 overflow-y-auto p-4 bg-white min-h-0">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <Loader2 size={24} className="animate-spin text-slate-400" />
                <span className="text-xs text-slate-400 font-bold tracking-tight mt-2">Connecting to Google Drive...</span>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-rose-500">
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl mb-3">
                  <X size={20} />
                </div>
                <h4 className="text-xs font-black tracking-tight text-rose-955">{error}</h4>
                <p className="text-[10px] text-slate-400 max-w-[280px] mt-1 leading-relaxed">
                  Make sure you have authorized access and your network is online.
                </p>
              </div>
            ) : files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl mb-3">
                  <File size={20} />
                </div>
                <h4 className="text-xs font-black tracking-tight text-slate-700">No matching files found</h4>
                <p className="text-[10px] text-slate-400 max-w-[220px] mt-1 leading-relaxed">
                  Create presentations or documents first using Slide/Doc features.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {files.map((file) => {
                  const isSelected = selectedFileId === file.id;
                  const dateString = new Date(file.modifiedTime).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={file.id}
                      onClick={() => handleSelectItem(file)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isSelected
                          ? 'bg-slate-50 border-slate-900 shadow-xs'
                          : 'bg-white border-slate-205 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {getMimeIcon(file.mimeType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-950 truncate leading-tight">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                          <Clock size={10} />
                          <span>Edited {dateString}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle size={15} className="text-slate-950 shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between">
            <div className="text-[10px] text-slate-400 font-bold max-w-[260px] leading-relaxed">
              * Fully integrated workspace selector fallback for security compliance.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-250 hover:border-slate-300 bg-white text-slate-650 hover:text-slate-900 rounded-xl font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedFileId}
                onClick={handleConfirmSelection}
                className="px-4.5 py-2 bg-slate-950 hover:bg-slate-850 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-slate-950/10"
              >
                Select File
                <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WorkspacePicker;
