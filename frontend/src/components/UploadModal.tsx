import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, FileCheck } from 'lucide-react';
import { apiClient } from '../api/client';

interface UploadModalProps {
  onUploadSuccess: (documentId: string) => void;
  onCancel: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  onUploadSuccess,
  onCancel,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setError(null);
    const validExts = ['.pdf', '.docx', '.doc'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExts.includes(ext)) {
      setError(`Unsupported file type '${ext}'. Please upload a PDF or Word document (.pdf, .docx, .doc).`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(25);
    setError(null);

    try {
      setProgress(50);
      const res = await apiClient.uploadTender(selectedFile);
      setProgress(100);
      onUploadSuccess(res.document_id);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
      <div className="glass-panel" style={{
        padding: '2.5rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Upload Tender Document
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem' }}>
            Ingest text-based PDFs, scanned image PDFs, or Word documents for automatic 12-parameter extraction and evidence verification.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? '#2563eb' : 'rgba(147, 197, 253, 0.8)'}`,
            backgroundColor: dragActive ? 'rgba(239, 246, 255, 0.85)' : 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '0.85rem',
            padding: '2.75rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: dragActive ? '0 12px 30px rgba(37, 99, 235, 0.18)' : '0 4px 16px rgba(31, 38, 135, 0.04)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 246, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(191, 219, 254, 0.8)',
            color: '#1e3a8a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 6px 18px rgba(37, 99, 235, 0.15)',
          }}>
            <UploadCloud size={32} />
          </div>

          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
            {selectedFile ? selectedFile.name : 'Drag & drop tender document here, or click to browse'}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 500 }}>
            Supports PDF (native & scanned), Word (.docx, .doc) • Max file size: 50MB
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="glass-card" style={{
            marginTop: '1.5rem',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(240, 253, 244, 0.75)',
            borderColor: 'rgba(187, 247, 208, 0.85)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileCheck size={20} color="#16a34a" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#14532d' }}>
                {selectedFile.name}
              </span>
              <span style={{ fontSize: '0.775rem', color: '#166534', fontWeight: 500 }}>
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              style={{
                fontSize: '0.8rem',
                color: '#dc2626',
                border: 'none',
                background: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.825rem',
              color: '#334155',
              fontWeight: 600,
              marginBottom: '0.45rem',
            }}>
              <span>Uploading & initiating extraction engine...</span>
              <span>{progress}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '9px',
              backgroundColor: 'rgba(226, 232, 240, 0.7)',
              borderRadius: '9999px',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)',
                boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.85rem 1.15rem',
            backgroundColor: 'rgba(254, 226, 226, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(254, 202, 202, 0.9)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#991b1b',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.08)',
          }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.85rem',
          marginTop: '2rem',
        }}>
          <button
            onClick={onCancel}
            disabled={uploading}
            className="glass-btn-secondary"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="glass-btn-primary"
            style={{
              padding: '0.6rem 1.5rem',
            }}
          >
            <UploadCloud size={18} />
            {uploading ? 'Processing...' : 'Upload & Analyze Tender'}
          </button>
        </div>
      </div>
    </div>
  );
};

