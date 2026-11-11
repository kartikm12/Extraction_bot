import React, { useState } from 'react';
import {
  Download, FileText, CheckCircle2, AlertOctagon,
  RefreshCw, ExternalLink, ShieldCheck, ArrowLeft, ArrowRight
} from 'lucide-react';
import { DocumentProcessingRecord, ParameterKey } from '../types';
import { apiClient } from '../api/client';

interface ResultsDownloadsProps {
  record: DocumentProcessingRecord;
  onGoToReview: () => void;
  onGoToDashboard: () => void;
  onRefresh: () => void;
}

const ORDERED_KEYS: ParameterKey[] = [
  'tender_no', 'authority', 'objective', 'core_scope',
  'implementation', 'om', 'selection', 'consortium',
  'bid_dates', 'emd', 'performance_security', 'indicative_value'
];

export const ResultsDownloads: React.FC<ResultsDownloadsProps> = ({
  record,
  onGoToReview,
  onGoToDashboard,
  onRefresh,
}) => {
  const [regenerating, setRegenerating] = useState(false);
  const [regenSuccess, setRegenSuccess] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await apiClient.regenerateReports(record.document_id, true);
      onRefresh();
      setRegenSuccess(true);
      setTimeout(() => setRegenSuccess(false), 3500);
    } catch (e) {
      alert('Error re-checking document and regenerating reports');
    } finally {
      setRegenerating(false);
    }
  };

  const parameters = record.parameters || {};

  return (
    <div style={{ maxWidth: '1080px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <button
            onClick={onGoToDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '0.35rem',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1e3a8a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Reports & Artifact Downloads
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.15rem' }}>
            Production Microsoft Word summary and Excel evidence verification logs for Tender <strong style={{ color: '#1e3a8a' }}>{record.document_id}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {regenSuccess && (
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
              ✓ Document re-checked & reports regenerated!
            </span>
          )}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="glass-btn-secondary"
            title="Re-checks the uploaded document, extracts and verifies all 12 parameters afresh, and regenerates Word and Excel reports"
          >
            <RefreshCw size={15} className={regenerating ? 'pulsing' : ''} />
            {regenerating ? 'Re-checking Document & Regenerating...' : 'Regenerate Reports'}
          </button>

          <button
            onClick={onGoToReview}
            className="glass-btn-primary"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.85) 0%, rgba(59, 130, 246, 0.85) 100%)',
            }}
          >
            Edit & Review Clauses
          </button>
        </div>
      </div>

      {/* Download Action Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.25rem',
      }}>
        {/* Word Document Download Card */}
        <div className="glass-card glass-card-interactive" style={{
          padding: '1.65rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderColor: 'rgba(191, 219, 254, 0.85)',
          background: 'rgba(239, 246, 255, 0.65)',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '0.65rem',
              backgroundColor: 'rgba(219, 234, 254, 0.8)',
              backdropFilter: 'blur(6px)',
              color: '#1e3a8a',
              borderRadius: '0.5rem',
              marginBottom: '0.85rem',
              border: '1px solid rgba(191, 219, 254, 0.9)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)',
            }}>
              <FileText size={26} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Microsoft Word Summary (.docx)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.45 }}>
              Official 1-page executive summary formatted strictly to the 12 parameters in high-contrast government table layout.
            </p>
          </div>

          <a
            href={apiClient.getWordDownloadUrl(record.document_id)}
            download
            className="glass-btn-primary"
            style={{
              marginTop: '1.35rem',
              textDecoration: 'none',
              padding: '0.65rem 1rem',
            }}
          >
            <Download size={16} />
            Download Word Summary
          </a>
        </div>

        {/* Excel Verification Log Download Card */}
        <div className="glass-card glass-card-interactive" style={{
          padding: '1.65rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderColor: 'rgba(187, 247, 208, 0.85)',
          background: 'rgba(240, 253, 244, 0.65)',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '0.65rem',
              backgroundColor: 'rgba(220, 252, 231, 0.8)',
              backdropFilter: 'blur(6px)',
              color: '#16a34a',
              borderRadius: '0.5rem',
              marginBottom: '0.85rem',
              border: '1px solid rgba(187, 247, 208, 0.9)',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.12)',
            }}>
              <ShieldCheck size={26} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Excel Verification Log (.xlsx)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.45 }}>
              Full audit workbook with 16 structured columns, exact page citations, verbatim quotes, and conflicting evidence breakdowns.
            </p>
          </div>

          <a
            href={apiClient.getXlsxDownloadUrl(record.document_id)}
            download
            className="glass-btn-primary"
            style={{
              marginTop: '1.35rem',
              background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.95), rgba(22, 163, 74, 0.9))',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
              textDecoration: 'none',
              padding: '0.65rem 1rem',
            }}
          >
            <Download size={16} />
            Download Verification Log
          </a>
        </div>

        {/* Machine-Readable JSON Download Card */}
        <div className="glass-card glass-card-interactive" style={{
          padding: '1.65rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderColor: 'rgba(226, 232, 240, 0.85)',
          background: 'rgba(248, 250, 252, 0.65)',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '0.65rem',
              backgroundColor: 'rgba(241, 245, 249, 0.85)',
              backdropFilter: 'blur(6px)',
              color: '#475569',
              borderRadius: '0.5rem',
              marginBottom: '0.85rem',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 4px 12px rgba(100, 116, 139, 0.1)',
            }}>
              <ExternalLink size={26} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Audit Data JSON (.json)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.45 }}>
              Machine-readable schema export for enterprise database integration, ERP workflows, and downstream tender pipelines.
            </p>
          </div>

          <a
            href={apiClient.getJsonDownloadUrl(record.document_id)}
            download
            className="glass-btn-primary"
            style={{
              marginTop: '1.35rem',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(71, 85, 105, 0.9))',
              boxShadow: '0 4px 14px rgba(51, 65, 85, 0.3)',
              textDecoration: 'none',
              padding: '0.65rem 1rem',
            }}
          >
            <Download size={16} />
            Download JSON Schema
          </a>
        </div>
      </div>

      {/* Visual Word Document Preview */}
      <div className="glass-panel" style={{
        padding: '2.25rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem', borderBottom: '2px solid rgba(30, 58, 138, 0.4)', paddingBottom: '1.15rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.01em' }}>
            {parameters.authority?.final_value || parameters.authority?.extracted_value || 'TENDER ANALYSIS & EXECUTIVE SUMMARY'}
          </h2>
        </div>

        {/* 12-Parameter Table Preview */}
        <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid rgba(226, 232, 240, 0.7)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(37, 99, 235, 0.9))', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1.15rem', width: '28%', border: '1px solid rgba(30, 58, 138, 0.3)', letterSpacing: '0.04em', fontWeight: 700 }}>
                  PARAMETER
                </th>
                <th style={{ padding: '0.85rem 1.15rem', width: '72%', border: '1px solid rgba(30, 58, 138, 0.3)', letterSpacing: '0.04em', fontWeight: 700 }}>
                  DETAILS
                </th>
              </tr>
            </thead>
            <tbody>
              {ORDERED_KEYS.map((key, idx) => {
                const param = parameters[key];
                const isMissing = !param || param.extracted_value === '—' || param.status === 'Missing from source';
                const isReviewed = Boolean(param?.final_value || param?.reviewer_decision);
                const isConflict = !isReviewed && (param?.conflict_status || param?.status === 'Conflicting');
                let val = param?.final_value || param?.extracted_value || '—';

                // If reviewed or edited, guarantee any leftover conflict preamble is removed
                if (isReviewed && typeof val === 'string') {
                  val = val.replace(/^\[CONFLICT[ -][^\]]+\]\s*(?:Multiple contradictory values found:\s*)?/i, '').trim();
                }

                return (
                  <tr
                    key={key}
                    style={{
                      backgroundColor: idx % 2 === 1 ? 'rgba(248, 250, 252, 0.55)' : 'rgba(255, 255, 255, 0.55)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{
                      padding: '0.75rem 1.15rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      border: '1px solid rgba(226, 232, 240, 0.7)',
                      verticalAlign: 'top',
                    }}>
                      {param?.display_name || key}
                    </td>
                    <td style={{
                      padding: '0.75rem 1.15rem',
                      color: isMissing ? '#94a3b8' : '#0f172a',
                      border: '1px solid rgba(226, 232, 240, 0.7)',
                      verticalAlign: 'top',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-line',
                      fontWeight: 500,
                    }}>
                      {isConflict && (
                        <div style={{ color: '#c2410c', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          [CONFLICT DETECTED - REQUIRES REVIEW]
                        </div>
                      )}
                      <div>{val}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: '#94a3b8',
          fontStyle: 'italic',
          textAlign: 'center',
        }}>
          {/* Note: Summary strictly confined to the 12 predefined parameters extracted from source evidence. Conflicting parameters require human review.*/}
        </div>
      </div>
    </div>
  );
};

