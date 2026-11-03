import React, { useState, useRef } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, AlertOctagon,
  Clock, ArrowRight, UploadCloud, Eye, Filter, Trash2
} from 'lucide-react';
import { apiClient } from '../api/client';
import { DashboardStats } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  onRefresh?: () => void;
  onSelectDocument: (docId: string, preferredTab?: 'review' | 'results') => void;
  onGoToUpload: () => void;
}

type FilterType = 'all' | 'verified' | 'review' | 'conflicts' | 'failures';

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  loading,
  onRefresh,
  onSelectDocument,
  onGoToUpload,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const handleDelete = async (docId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" (${docId}) from processing history?\n\nThis will remove the extraction record, verification logs, and summary reports.`)) {
      return;
    }
    setDeletingId(docId);
    try {
      await apiClient.deleteTender(docId);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete tender');
    } finally {
      setDeletingId(null);
    }
  };

  const kpiCards: Array<{
    id: FilterType;
    label: string;
    count: number;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    activeBorder: string;
    hoverBorder: string;
    actionText: string;
  }> = [
    {
      id: 'all',
      label: 'Total Processed',
      count: stats?.total_processed ?? 0,
      subtitle: 'Across PDF and Word formats',
      icon: <FileText size={16} />,
      color: '#1e3a8a',
      bgColor: '#eff6ff',
      activeBorder: '#1e3a8a',
      hoverBorder: '#93c5fd',
      actionText: `View all (${stats?.total_processed ?? 0})`,
    },
    {
      id: 'verified',
      label: 'Fully Verified',
      count: stats?.successfully_processed ?? 0,
      subtitle: 'All 12 parameters confirmed',
      icon: <CheckCircle2 size={16} />,
      color: '#166534',
      bgColor: '#dcfce7',
      activeBorder: '#16a34a',
      hoverBorder: '#86efac',
      actionText: `View verified (${stats?.successfully_processed ?? 0})`,
    },
    {
      id: 'review',
      label: 'Requires Review',
      count: stats?.requiring_review ?? 0,
      subtitle: 'Awaiting reviewer approval',
      icon: <AlertTriangle size={16} />,
      color: '#92400e',
      bgColor: '#fef3c7',
      activeBorder: '#d97706',
      hoverBorder: '#fde047',
      actionText: (stats?.requiring_review ?? 0) > 0 ? `Review tenders (${stats?.requiring_review})` : '0 to review',
    },
    {
      id: 'conflicts',
      label: 'With Conflicts',
      count: stats?.with_conflicts ?? 0,
      subtitle: 'Contradictory values detected',
      icon: <AlertOctagon size={16} />,
      color: '#c2410c',
      bgColor: '#ffedd5',
      activeBorder: '#ea580c',
      hoverBorder: '#fdba74',
      actionText: (stats?.with_conflicts ?? 0) > 0 ? `View conflicts (${stats?.with_conflicts})` : '0 conflicts',
    },
    {
      id: 'failures',
      label: 'Extraction Failures',
      count: stats?.with_failures ?? 0,
      subtitle: 'Corrupt uploads or OCR blocks',
      icon: <Clock size={16} />,
      color: '#dc2626',
      bgColor: '#fee2e2',
      activeBorder: '#dc2626',
      hoverBorder: '#fca5a5',
      actionText: (stats?.with_failures ?? 0) > 0 ? `View errors (${stats?.with_failures})` : '0 failures',
    },
  ];

  const handleCardClick = (targetFilter: FilterType) => {
    const history = stats?.recent_history || [];

    const matches = history.filter((doc) => {
      if (targetFilter === 'all') return true;
      if (targetFilter === 'verified') return doc.is_fully_verified;
      if (targetFilter === 'review') return doc.requires_human_review;
      if (targetFilter === 'conflicts') return doc.has_conflicts;
      if (targetFilter === 'failures') return doc.current_stage.toLowerCase().includes('fail') || !!doc.error_message;
      return true;
    });

    // If there is exactly 1 document needing review, navigate directly to review screen
    if (matches.length === 1 && (targetFilter === 'review' || targetFilter === 'conflicts')) {
      onSelectDocument(matches[0].document_id, 'review');
      return;
    }

    // If exactly 1 verified tender exists, navigate directly to its report view
    if (matches.length === 1 && targetFilter === 'verified') {
      onSelectDocument(matches[0].document_id, 'results');
      return;
    }

    // Set filter and scroll smoothly to table
    setFilter(targetFilter);
    if (historyRef.current) {
      historyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredHistory = (stats?.recent_history || []).filter((doc) => {
    if (filter === 'all') return true;
    if (filter === 'verified') return doc.is_fully_verified;
    if (filter === 'review') return doc.requires_human_review;
    if (filter === 'conflicts') return doc.has_conflicts;
    if (filter === 'failures') return doc.current_stage.toLowerCase().includes('fail') || !!doc.error_message;
    return true;
  });

  const activeCard = kpiCards.find((c) => c.id === filter);

  return (
    <div style={{ maxWidth: '1280px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Title & Actions Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Tender Processing Dashboard
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.15rem' }}>
            Overview of uploaded tenders, evidence verification audits, and detected clause contradictions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onGoToUpload}
            className="glass-btn-primary"
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.9rem',
            }}
          >
            <UploadCloud size={18} />
            Upload Tender
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Glassmorphism cards with smooth hover refraction */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {kpiCards.map((card) => {
          const isActive = filter === card.id;
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className="glass-card glass-card-interactive"
              style={{
                padding: '1rem 1.15rem',
                border: isActive ? `2px solid ${card.activeBorder}` : '1px solid rgba(255, 255, 255, 0.75)',
                boxShadow: isActive ? `0 8px 24px rgba(31, 38, 135, 0.12), 0 0 0 2px ${card.activeBorder}33` : undefined,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                cursor: 'pointer',
              }}
            >
              {/* Top Row: Title on left, Clickable Icon Badge on right */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.4rem',
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: card.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: 1.25,
                  minHeight: '2rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                }}>
                  {card.label}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(card.id);
                  }}
                  style={{
                    width: '34px',
                    height: '34px',
                    minWidth: '34px',
                    minHeight: '34px',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: card.bgColor,
                    color: card.color,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? `0 0 0 2px ${card.color}` : '0 2px 6px rgba(0,0,0,0.04)',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = isActive ? `0 0 0 2px ${card.color}` : '0 2px 6px rgba(0,0,0,0.04)';
                  }}
                  title={`Click to filter by ${card.label}`}
                  aria-label={`Filter tenders by ${card.label}`}
                >
                  {card.icon}
                </button>
              </div>

              {/* Number Metric */}
              <div style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.1,
                marginTop: '0.35rem',
                marginBottom: '0.2rem',
                letterSpacing: '-0.03em',
              }}>
                {card.count}
              </div>

              {/* Subtitle */}
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                lineHeight: 1.3,
                fontWeight: 500,
              }}>
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Processing History Section - Glass Panel */}
      <div
        ref={historyRef}
        className="glass-panel"
        style={{
          overflow: 'hidden',
          marginBottom: '2rem',
        }}
      >
        <div style={{
          padding: '1.15rem 1.4rem',
          borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem',
          background: 'rgba(255, 255, 255, 0.45)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Recent Processing History
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
              Audit trail of ingested tender documents and extraction status.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                fontSize: '0.775rem',
                fontWeight: 600,
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                border: filter === 'all' ? '1px solid #1e3a8a' : '1px solid rgba(203, 213, 225, 0.7)',
                backgroundColor: filter === 'all' ? '#1e3a8a' : 'rgba(255, 255, 255, 0.6)',
                color: filter === 'all' ? '#ffffff' : '#475569',
                backdropFilter: 'blur(6px)',
                cursor: 'pointer',
                boxShadow: filter === 'all' ? '0 2px 8px rgba(30, 58, 138, 0.25)' : 'none',
              }}
            >
              All ({stats?.total_processed ?? 0})
            </button>
            <button
              onClick={() => setFilter('verified')}
              style={{
                fontSize: '0.775rem',
                fontWeight: 600,
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                border: filter === 'verified' ? '1px solid #16a34a' : '1px solid rgba(203, 213, 225, 0.7)',
                backgroundColor: filter === 'verified' ? '#16a34a' : 'rgba(255, 255, 255, 0.6)',
                color: filter === 'verified' ? '#ffffff' : '#166534',
                backdropFilter: 'blur(6px)',
                cursor: 'pointer',
                boxShadow: filter === 'verified' ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none',
              }}
            >
              Verified ({stats?.successfully_processed ?? 0})
            </button>
            <button
              onClick={() => setFilter('review')}
              style={{
                fontSize: '0.775rem',
                fontWeight: 600,
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                border: filter === 'review' ? '1px solid #d97706' : '1px solid rgba(203, 213, 225, 0.7)',
                backgroundColor: filter === 'review' ? '#d97706' : 'rgba(255, 255, 255, 0.6)',
                color: filter === 'review' ? '#ffffff' : '#92400e',
                backdropFilter: 'blur(6px)',
                cursor: 'pointer',
                boxShadow: filter === 'review' ? '0 2px 8px rgba(217, 119, 6, 0.25)' : 'none',
              }}
            >
              Needs Review ({stats?.requiring_review ?? 0})
            </button>
            <button
              onClick={() => setFilter('conflicts')}
              style={{
                fontSize: '0.775rem',
                fontWeight: 600,
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                border: filter === 'conflicts' ? '1px solid #ea580c' : '1px solid rgba(203, 213, 225, 0.7)',
                backgroundColor: filter === 'conflicts' ? '#ea580c' : 'rgba(255, 255, 255, 0.6)',
                color: filter === 'conflicts' ? '#ffffff' : '#c2410c',
                backdropFilter: 'blur(6px)',
                cursor: 'pointer',
                boxShadow: filter === 'conflicts' ? '0 2px 8px rgba(234, 88, 12, 0.25)' : 'none',
              }}
            >
              Conflicts ({stats?.with_conflicts ?? 0})
            </button>
          </div>
        </div>

        {/* Active Filter Bar when a specific filter is selected */}
        {filter !== 'all' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.55rem 1.4rem',
            backgroundColor: activeCard?.bgColor || 'rgba(248, 250, 252, 0.75)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
            fontSize: '0.8rem',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={14} style={{ color: activeCard?.color || '#475569' }} />
              <span style={{ color: '#475569' }}>Filtered by:</span>
              <span style={{
                fontWeight: 700,
                color: activeCard?.color || '#0f172a',
              }}>
                {activeCard?.label} ({filteredHistory.length})
              </span>
            </div>
            <button
              onClick={() => setFilter('all')}
              style={{
                fontSize: '0.75rem',
                color: '#1e3a8a',
                background: 'none',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear filter (Show All)
            </button>
          </div>
        )}

        {/* Table Content */}
        {filteredHistory.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <FileText size={40} style={{ color: '#cbd5e1', marginBottom: '0.85rem' }} />
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '1rem' }}>
              {filter === 'all'
                ? 'No tender documents processed yet'
                : `No tenders found in "${activeCard?.label || filter}"`}
            </div>
            <p style={{ fontSize: '0.875rem', marginTop: '0.35rem', color: '#64748b' }}>
              {filter === 'all'
                ? 'Click "Upload Tender" to ingest your first government RFP or tender specification.'
                : 'All documents in the system are currently under other stages.'}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="glass-btn-primary"
                style={{
                  marginTop: '1.25rem',
                  padding: '0.5rem 1.15rem',
                  fontSize: '0.825rem',
                }}
              >
                View All Tenders
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr className="glass-th">
                  <th style={{ padding: '0.85rem 1.15rem' }}>Document ID</th>
                  <th style={{ padding: '0.85rem 1.15rem' }}>Original Filename</th>
                  <th style={{ padding: '0.85rem 1.15rem' }}>Format</th>
                  <th style={{ padding: '0.85rem 1.15rem' }}>Pages</th>
                  <th style={{ padding: '0.85rem 1.15rem' }}>Stage</th>
                  <th style={{ padding: '0.85rem 1.15rem' }}>Status & Findings</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((doc) => {
                  return (
                    <tr
                      key={doc.document_id}
                      className="glass-tr"
                    >
                      <td style={{ padding: '0.9rem 1.15rem', fontWeight: 700, color: '#1e3a8a' }}>
                        {doc.document_id}
                      </td>
                      <td style={{ padding: '0.9rem 1.15rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: '#1e293b' }}>
                        {doc.original_filename}
                      </td>
                      <td style={{ padding: '0.9rem 1.15rem' }}>
                        <span style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.35rem',
                          backgroundColor: doc.file_type === 'pdf' ? 'rgba(239, 246, 255, 0.85)' : 'rgba(240, 253, 244, 0.85)',
                          color: doc.file_type === 'pdf' ? '#1e40af' : '#166534',
                          border: doc.file_type === 'pdf' ? '1px solid rgba(191, 219, 254, 0.7)' : '1px solid rgba(187, 247, 208, 0.7)',
                          backdropFilter: 'blur(4px)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.025em',
                        }}>
                          {doc.file_type}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.15rem', color: '#64748b', fontWeight: 500 }}>
                        {doc.page_count || '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1.15rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>
                          {doc.current_stage}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.15rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {doc.has_conflicts && (
                            <span className="glass-badge-conflict" style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.55rem',
                            }}>
                              Conflict
                            </span>
                          )}
                          {doc.requires_human_review && (
                            <span className="glass-badge-review" style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.55rem',
                            }}>
                              Needs Review
                            </span>
                          )}
                          {doc.is_fully_verified && (
                            <span className="glass-badge-verified" style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.55rem',
                            }}>
                              Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => onSelectDocument(doc.document_id, doc.is_fully_verified && !doc.has_conflicts ? 'results' : 'review')}
                            className="glass-btn-action"
                          >
                            <Eye size={14} />
                            {doc.is_fully_verified && !doc.has_conflicts ? 'View Report' : 'Review'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(doc.document_id, doc.original_filename);
                            }}
                            disabled={deletingId === doc.document_id}
                            title="Delete from history"
                            aria-label="Delete tender from history"
                            className="glass-btn-delete"
                            style={{
                              cursor: deletingId === doc.document_id ? 'not-allowed' : 'pointer',
                              opacity: deletingId === doc.document_id ? 0.5 : 1,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default Dashboard;
