import React from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, AlertOctagon,
  Clock, ArrowRight, UploadCloud, RefreshCw, Eye
} from 'lucide-react';
import { DashboardStats } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  onRefresh: () => void;
  onSelectDocument: (docId: string) => void;
  onGoToUpload: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  loading,
  onRefresh,
  onSelectDocument,
  onGoToUpload,
}) => {
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Tender Processing Dashboard
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Overview of uploaded tenders, evidence verification audits, and detected clause contradictions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#334155',
            }}
          >
            <RefreshCw size={15} className={loading ? 'pulsing' : ''} />
            Refresh
          </button>

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
            }}
          >
            <UploadCloud size={16} />
            Upload Tender
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Total Processed */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Processed
            </span>
            <div style={{ backgroundColor: '#eff6ff', color: '#1e3a8a', padding: '0.4rem', borderRadius: '0.375rem' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>
            {stats?.total_processed ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Across PDF and Word formats
          </div>
        </div>

        {/* Successfully Verified */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
              Fully Verified
            </span>
            <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.4rem', borderRadius: '0.375rem' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#166534', marginTop: '0.5rem' }}>
            {stats?.successfully_processed ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            All 12 parameters confirmed
          </div>
        </div>

        {/* Requiring Review */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
              Requires Review
            </span>
            <div style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.4rem', borderRadius: '0.375rem' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e', marginTop: '0.5rem' }}>
            {stats?.requiring_review ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Awaiting reviewer approval
          </div>
        </div>

        {/* Conflicting Clauses */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c2410c', textTransform: 'uppercase' }}>
              With Conflicts
            </span>
            <div style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: '0.4rem', borderRadius: '0.375rem' }}>
              <AlertOctagon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#c2410c', marginTop: '0.5rem' }}>
            {stats?.with_conflicts ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Contradictory values detected
          </div>
        </div>

        {/* Failures / Errors */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991b1b', textTransform: 'uppercase' }}>
              Extraction Failures
            </span>
            <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.4rem', borderRadius: '0.375rem' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#991b1b', marginTop: '0.5rem' }}>
            {stats?.with_failures ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Corrupt uploads or OCR blocks
          </div>
        </div>
      </div>

      {/* Recent Processing History Section */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Recent Processing History
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Audit trail of ingested tender documents and extraction status.
            </p>
          </div>
        </div>

        {!stats?.recent_history || stats.recent_history.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <FileText size={36} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>No tender documents processed yet</div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Click "Upload Tender" to ingest your first government RFP or tender specification.
            </p>
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
                {stats.recent_history.map((doc) => {
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
                          onClick={() => onSelectDocument(doc.document_id)}
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
                          }}
                        >
                          <Eye size={14} />
                          View
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
