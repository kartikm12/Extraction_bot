import React from 'react';
import { FileText, BarChart3, UploadCloud, CheckCircle2, ShieldCheck, Download, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'upload' | 'status' | 'review' | 'results';
  setCurrentTab: (tab: 'dashboard' | 'upload' | 'status' | 'review' | 'results') => void;
  activeDocId: string | null;
  hasConflicts?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeDocId,
  hasConflicts,
}) => {
  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            backgroundColor: '#1e3a8a',
            color: '#ffffff',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Tender Analysis & Extraction Bot
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Evidence-Verified Document Intelligence • 12 Predefined Parameters
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: currentTab === 'dashboard' ? '#1e3a8a' : 'transparent',
              color: currentTab === 'dashboard' ? '#ffffff' : '#475569',
            }}
          >
            <BarChart3 size={16} />
            Dashboard
          </button>

          <button
            onClick={() => setCurrentTab('upload')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: currentTab === 'upload' ? '#1e3a8a' : 'transparent',
              color: currentTab === 'upload' ? '#ffffff' : '#475569',
            }}
          >
            <UploadCloud size={16} />
            Upload Tender
          </button>

          {activeDocId && (
            <>
              <button
                onClick={() => setCurrentTab('status')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  backgroundColor: currentTab === 'status' ? '#1e3a8a' : 'transparent',
                  color: currentTab === 'status' ? '#ffffff' : '#475569',
                }}
              >
                <CheckCircle2 size={16} />
                Status
              </button>

              <button
                onClick={() => setCurrentTab('review')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  backgroundColor: currentTab === 'review' ? '#1e3a8a' : 'transparent',
                  color: currentTab === 'review' ? '#ffffff' : '#475569',
                  position: 'relative',
                }}
              >
                <FileText size={16} />
                Review & Verification
                {hasConflicts && (
                  <span style={{
                    backgroundColor: '#ea580c',
                    color: '#fff',
                    borderRadius: '9999px',
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.7rem',
                    marginLeft: '0.2rem',
                    fontWeight: 700,
                  }}>
                    !
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentTab('results')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  backgroundColor: currentTab === 'results' ? '#1e3a8a' : 'transparent',
                  color: currentTab === 'results' ? '#ffffff' : '#475569',
                }}
              >
                <Download size={16} />
                Reports & Downloads
              </button>
            </>
          )}
        </nav>

        {/* Active Doc Pill */}
        {activeDocId && (
          <div style={{
            fontSize: '0.8rem',
            padding: '0.25rem 0.65rem',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '9999px',
            color: '#334155',
            fontWeight: 600,
          }}>
            Tender: <span style={{ color: '#1e3a8a' }}>{activeDocId}</span>
          </div>
        )}
      </div>
    </header>
  );
};

