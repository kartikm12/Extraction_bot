import React, { useState, useRef } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, AlertOctagon,
  Clock, ArrowRight, UploadCloud, Eye, Filter
} from 'lucide-react';
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
  onSelectDocument,
  onGoToUpload,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const historyRef = useRef<HTMLDivElement>(null);

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
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Tender Processing Dashboard
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Overview of uploaded tenders, evidence verification audits, and detected clause contradictions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onGoToUpload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <UploadCloud size={16} />
            Upload Tender
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Fitted, aligned, icon-click navigation */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.75rem',
      }}>
        {kpiCards.map((card) => {
          const isActive = filter === card.id;
          return (
            <div
              key={card.id}
              style={{
                backgroundColor: '#ffffff',
                padding: '0.9rem 1rem',
                borderRadius: '0.5rem',
                border: isActive ? `1.5px solid ${card.activeBorder}` : '1px solid #e2e8f0',
                boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
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
                  letterSpacing: '0.025em',
                  lineHeight: 1.25,
                  minHeight: '2rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                }}>
                  {card.label}
                </span>

                <button
                  type="button"
                  onClick={() => handleCardClick(card.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    minHeight: '32px',
                    borderRadius: '0.375rem',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: card.bgColor,
                    color: card.color,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? `0 0 0 2px ${card.color}` : 'none',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = isActive ? `0 0 0 2px ${card.color}` : 'none';
                  }}
                  title={`Click to filter by ${card.label}`}
                  aria-label={`Filter tenders by ${card.label}`}
                >
                  {card.icon}
                </button>
              </div>

              {/* Number Metric */}
              <div style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.1,
                marginTop: '0.35rem',
                marginBottom: '0.2rem',
              }}>
                {card.count}
              </div>

              {/* Subtitle */}
              <div style={{
                fontSize: '0.725rem',
                color: '#64748b',
                lineHeight: 1.25,
              }}>
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Processing History Section */}
      <div
        ref={historyRef}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Recent Processing History
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Audit trail of ingested tender documents and extraction status.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                border: filter === 'all' ? '1px solid #1e3a8a' : '1px solid #e2e8f0',
                backgroundColor: filter === 'all' ? '#1e3a8a' : '#ffffff',
                color: filter === 'all' ? '#ffffff' : '#475569',
                cursor: 'pointer',
              }}
            >
              All ({stats?.total_processed ?? 0})
            </button>
            <button
              onClick={() => setFilter('verified')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                border: filter === 'verified' ? '1px solid #16a34a' : '1px solid #e2e8f0',
                backgroundColor: filter === 'verified' ? '#16a34a' : '#ffffff',
                color: filter === 'verified' ? '#ffffff' : '#166534',
                cursor: 'pointer',
              }}
            >
              Verified ({stats?.successfully_processed ?? 0})
            </button>
            <button
              onClick={() => setFilter('review')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                border: filter === 'review' ? '1px solid #d97706' : '1px solid #e2e8f0',
                backgroundColor: filter === 'review' ? '#d97706' : '#ffffff',
                color: filter === 'review' ? '#ffffff' : '#92400e',
                cursor: 'pointer',
              }}
            >
              Needs Review ({stats?.requiring_review ?? 0})
            </button>
            <button
              onClick={() => setFilter('conflicts')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                border: filter === 'conflicts' ? '1px solid #ea580c' : '1px solid #e2e8f0',
                backgroundColor: filter === 'conflicts' ? '#ea580c' : '#ffffff',
                color: filter === 'conflicts' ? '#ffffff' : '#c2410c',
                cursor: 'pointer',
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
            padding: '0.5rem 1.25rem',
            backgroundColor: activeCard?.bgColor || '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.8rem',
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
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <FileText size={36} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>
              {filter === 'all'
                ? 'No tender documents processed yet'
                : `No tenders found in "${activeCard?.label || filter}"`}
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {filter === 'all'
                ? 'Click "Upload Tender" to ingest your first government RFP or tender specification.'
                : 'All documents in the system are currently under other stages.'}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                style={{
                  marginTop: '1rem',
                  padding: '0.45rem 1rem',
                  backgroundColor: '#1e3a8a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
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
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Document ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Original Filename</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Format</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pages</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Stage</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status & Findings</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((doc) => {
                  return (
                    <tr
                      key={doc.document_id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e3a8a' }}>
                        {doc.document_id}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.original_filename}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: doc.file_type === 'pdf' ? '#eff6ff' : '#f0fdf4',
                          color: doc.file_type === 'pdf' ? '#1e40af' : '#166534',
                          textTransform: 'uppercase',
                        }}>
                          {doc.file_type}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                        {doc.page_count || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                          {doc.current_stage}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {doc.has_conflicts && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: '#ffedd5',
                              color: '#c2410c',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                            }}>
                              Conflict
                            </span>
                          )}
                          {doc.requires_human_review && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                            }}>
                              Needs Review
                            </span>
                          )}
                          {doc.is_fully_verified && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                            }}>
                              Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => onSelectDocument(doc.document_id, doc.is_fully_verified && !doc.has_conflicts ? 'results' : 'review')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.75rem',
                            backgroundColor: '#eff6ff',
                            color: '#1e3a8a',
                            border: '1px solid #bfdbfe',
                            borderRadius: '0.375rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={14} />
                          {doc.is_fully_verified && !doc.has_conflicts ? 'View Report' : 'Review'}
                        </button>
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
