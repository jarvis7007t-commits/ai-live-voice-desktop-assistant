import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  HardDrive, 
  Upload, 
  RefreshCcw, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  FileImage,
  FileVideo,
  FileText,
  FileCode,
  FileSpreadsheet,
  File as FileIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listDriveFiles, deleteDriveFile, uploadDriveFile, DriveFile } from '../services/driveService';
import { googleSignIn, getAccessToken } from '../lib/auth';

interface DriveViewProps {
  onClose: () => void;
}

const DriveView: React.FC<DriveViewProps> = ({ onClose }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Auth requirement
  const [hasToken, setHasToken] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkAuth = async () => {
    const token = await getAccessToken();
    setHasToken(!!token);
    return !!token;
  };

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const authenticated = await checkAuth();
      if (!authenticated) {
        setIsLoading(false);
        return;
      }
      const items = await listDriveFiles(30);
      setFiles(items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Drive files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setHasToken(true);
        fetchFiles();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleDeleteFile = async (fileId: string, filename: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the file "${filename}" from Google Drive? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteDriveFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const result = await uploadDriveFile(uploadedFiles[0]);
      // Refresh file list or inject
      fetchFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    setIsUploading(true);
    try {
      await uploadDriveFile(droppedFiles[0]);
      fetchFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to upload dropped file');
    } finally {
      setIsUploading(false);
    }
  };

  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="text-emerald-500" size={20} />;
    if (mimeType.startsWith('video/')) return <FileVideo className="text-purple-500" size={20} />;
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" size={20} />;
    if (mimeType.includes('sheet') || mimeType.includes('csv')) return <FileSpreadsheet className="text-emerald-600" size={20} />;
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('html')) return <FileCode className="text-blue-500" size={20} />;
    return <FileIcon className="text-slate-400" size={20} />;
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
      <input 
        ref={fileInputRef} 
        type="file" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100/30">
            <HardDrive size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Google Drive</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Integrated Cloud Drive</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasToken && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-emerald-500/10 disabled:opacity-55"
            >
              {isUploading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Upload size={14} />
              )}
              Upload File
            </button>
          )}
          <button 
            onClick={fetchFiles}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors text-slate-400"
            title="Refresh files"
          >
            <RefreshCcw size={15} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors text-slate-400">
             <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
        {!hasToken ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4 border border-emerald-100/30">
              <HardDrive size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Connect your Google Drive</h2>
            <p className="text-slate-400 max-w-sm text-xs font-medium mb-6 leading-relaxed">
              Link your Google Drive integration to securely browse files, upload assets, and manage storage directly.
            </p>
            <button 
              onClick={handleSignIn}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              Sign In with Google
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/50">
            <Loader2 className="animate-spin text-emerald-500 mb-3" size={28} />
            <span className="text-xs font-semibold text-slate-500">Retrieving drive contents...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50">
            <AlertCircle className="text-red-500 mb-3" size={32} />
            <h3 className="font-bold text-slate-800 text-sm">Failed to load files</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">{error}</p>
            <button 
              onClick={fetchFiles}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          <div 
            className={`flex-1 overflow-y-auto p-6 space-y-4 relative ${dragOver ? 'bg-emerald-50/40 border-2 border-dashed border-emerald-400 rounded-xl' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {dragOver && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/65 pointer-events-none transition-all">
                <Upload className="text-emerald-500 mb-2 animate-bounce" size={32} />
                <span className="text-sm font-bold text-emerald-600">Drop file to upload to Google Drive</span>
              </div>
            )}

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="text"
                placeholder="Search storage files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-400/50 transition-all shadow-sm"
              />
            </div>

            {filteredFiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <p className="text-xs font-bold text-slate-400">No storage files found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFiles.map(file => (
                  <div 
                    key={file.id}
                    className="group flex items-center p-4 rounded-2xl bg-white border border-slate-200/50 hover:border-slate-300 hover:shadow-md transition-all h-20"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mr-4 shrink-0 border border-slate-100 shadow-sm overflow-hidden">
                      {file.thumbnailLink ? (
                        <img 
                          src={file.thumbnailLink} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        getFileIcon(file.mimeType)
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-slate-800 leading-snug truncate">
                        {file.name}
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1">
                        {formatSize(file.size)} • {new Date(file.createdTime).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.webViewLink && (
                        <a 
                          href={file.webViewLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-all shadow-sm"
                          title="View on Google Drive"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className="p-1.5 border border-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg transition-all shadow-sm"
                        title="Delete file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriveView;
