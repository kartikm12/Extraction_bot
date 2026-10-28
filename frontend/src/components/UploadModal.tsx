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
    <div style={{ maxWidth: '720px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Upload Tender Document
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
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
            border: `2px dashed ${dragActive ? '#1e3a8a' : '#cbd5e1'}`,
            backgroundColor: dragActive ? '#eff6ff' : '#f8fafc',
            borderRadius: '0.5rem',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
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
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: '#1e3a8a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <UploadCloud size={30} />
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
            {selectedFile ? selectedFile.name : 'Drag & drop tender document here, or click to browse'}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
            Supports PDF (native & scanned), Word (.docx, .doc) • Max file size: 50MB
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div style={{
            marginTop: '1.25rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#f1f5f9',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={18} color="#16a34a" />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                {selectedFile.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              style={{
                fontSize: '0.75rem',
                color: '#dc2626',
                border: 'none',
                background: 'none',
                fontWeight: 600,
              }}
            >
              Remove
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#475569',
              marginBottom: '0.35rem',
            }}>
              <span>Uploading & initiating extraction engine...</span>
              <span>{progress}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e2e8f0',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#1e3a8a',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            marginTop: '1.25rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          marginTop: '2rem',
        }}>
          <button
            onClick={onCancel}
            disabled={uploading}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: selectedFile && !uploading ? '#1e3a8a' : '#94a3b8',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <UploadCloud size={16} />
            {uploading ? 'Processing...' : 'Upload & Analyze Tender'}
          </button>
        </div>
      </div>
    </div>
  );
};

