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
    <header className="glass-navbar" style={{
      width: '100%',
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
        {/* Navigation Back button */}
        {currentTab !== 'dashboard' && (
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="glass-btn-secondary"
            style={{
              position: 'absolute',
              left: '1.5rem',
              padding: '0.45rem 0.85rem',
              fontSize: '0.825rem',
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
              width: '42px',
              height: '42px',
              objectFit: 'contain',
              borderRadius: '0.65rem',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(30, 58, 138, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              fontWeight: 800,
              fontSize: '1.25rem',
              color: '#0f172a',
              letterSpacing: '-0.025em',
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
              fontWeight: 500,
            }}>
              Evidence-Verified Document Intelligence • 12 Predefined Parameters
            </div>
          </div>
        </div>

        {/* Active Document Indicator (positioned absolute) */}
        {activeDocId && currentTab !== 'dashboard' && (
          <div className="glass-card" style={{
            position: 'absolute',
            right: '1.5rem',
            fontSize: '0.8rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            color: '#334155',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 8px rgba(31, 38, 135, 0.06)',
          }}>
            Tender: <span style={{ color: '#1e3a8a', fontWeight: 700 }}>{activeDocId}</span>
          </div>
        )}
      </div>
    </header>
  );
};
