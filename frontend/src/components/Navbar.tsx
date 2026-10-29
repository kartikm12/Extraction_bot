import React from 'react';
import { ArrowLeft } from 'lucide-react';

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
        padding: '0.85rem 1.5rem',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Navigation Back button (visible when on subpages, positioned absolute so center branding stays perfectly centered) */}
        {currentTab !== 'dashboard' && (
          <button
            onClick={() => setCurrentTab('dashboard')}
            style={{
              position: 'absolute',
              left: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
            title="Return to Dashboard"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        )}

        {/* Center-aligned Brand: Extraction Bot Logo + Header Text */}
        <div
          onClick={() => setCurrentTab('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.85rem',
            cursor: 'pointer',
            textAlign: 'center',
            userSelect: 'none',
          }}
          title="Tender Docs Analysis & Extraction Bot Dashboard"
        >
          <img
            src="/extraction-bot-logo.png"
            alt="Extraction Bot Logo"
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'contain',
              borderRadius: '0.5rem',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              fontWeight: 700,
              fontSize: '1.2rem',
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              textAlign: 'center',
            }}>
              Tender Docs Analysis & Extraction Bot
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#64748b',
              letterSpacing: '-0.01em',
              textAlign: 'center',
            }}>
              Evidence-Verified Document Intelligence • 12 Predefined Parameters
            </div>
          </div>
        </div>

        {/* Active Document Indicator (positioned absolute) */}
        {activeDocId && currentTab !== 'dashboard' && (
          <div style={{
            position: 'absolute',
            right: '1.5rem',
            fontSize: '0.8rem',
            padding: '0.3rem 0.75rem',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '9999px',
            color: '#334155',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}>
            Tender: <span style={{ color: '#1e3a8a' }}>{activeDocId}</span>
          </div>
        )}
      </div>
    </header>
  );
};
