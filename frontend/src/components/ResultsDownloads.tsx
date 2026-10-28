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
      await apiClient.regenerateReports(record.document_id);
      onRefresh();
      setRegenSuccess(true);
      setTimeout(() => setRegenSuccess(false), 3000);
    } catch (e) {
      alert('Error regenerating reports');
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
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <button
            onClick={onGoToDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.825rem',
              cursor: 'pointer',
              marginBottom: '0.25rem',
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Reports & Artifact Downloads
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Production Microsoft Word summary and Excel evidence verification logs for Tender <strong>{record.document_id}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {regenSuccess && (
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              ✓ Reports updated!
            </span>
          )}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#334155',
            }}
          >
            <RefreshCw size={15} className={regenerating ? 'pulsing' : ''} />
            {regenerating ? 'Regenerating...' : 'Regenerate Reports'}
          </button>

          <button
            onClick={onGoToReview}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              backgroundColor: '#eff6ff',
              color: '#1e3a8a',
              border: '1px solid #bfdbfe',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
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
        marginBottom: '2rem',
      }}>
        {/* Word Document Download Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          border: '1px solid #bfdbfe',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(30,58,138,0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '0.5rem',
              backgroundColor: '#eff6ff',
              color: '#1e3a8a',
              borderRadius: '0.375rem',
              marginBottom: '0.75rem',
            }}>
              <FileText size={24} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Microsoft Word Summary (.docx)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem' }}>
              Official 1-page executive summary formatted strictly to the 12 parameters in high-contrast government table layout.
            </p>
          </div>

          <a
            href={apiClient.getWordDownloadUrl(record.document_id)}
            download
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <Download size={16} />
            Download Word Summary
          </a>
        </div>

        {/* Excel Verification Log Download Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          border: '1px solid #bbf7d0',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(22,101,52,0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '0.5rem',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              borderRadius: '0.375rem',
              marginBottom: '0.75rem',
            }}>
              <ShieldCheck size={24} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Excel Verification Log (.xlsx)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem' }}>
              Full audit workbook with 16 structured columns, exact page citations, verbatim quotes, and conflicting evidence breakdowns.
            </p>
          </div>

          <a
            href={apiClient.getXlsxDownloadUrl(record.document_id)}
            download
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <Download size={16} />
            Download Verification Log
          </a>
        </div>

        {/* Machine-Readable JSON Download Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '0.5rem',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              borderRadius: '0.375rem',
              marginBottom: '0.75rem',
            }}>
              <ExternalLink size={24} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Audit Data JSON (.json)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem' }}>
              Machine-readable schema export for enterprise database integration, ERP workflows, and downstream tender pipelines.
            </p>
          </div>

          <a
            href={apiClient.getJsonDownloadUrl(record.document_id)}
            download
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              backgroundColor: '#334155',
              color: '#ffffff',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <Download size={16} />
            Download JSON Schema
          </a>
        </div>
      </div>

      {/* Visual Word Document Preview */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #1e3a8a', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.02em' }}>
            {parameters.authority?.final_value || parameters.authority?.extracted_value || 'TENDER ANALYSIS & EXECUTIVE SUMMARY'}
          </h2>
        </div>

        {/* 12-Parameter Table Preview */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 1rem', width: '28%', border: '1px solid #1e3a8a', letterSpacing: '0.04em' }}>
                PARAMETER
              </th>
              <th style={{ padding: '0.75rem 1rem', width: '72%', border: '1px solid #1e3a8a', letterSpacing: '0.04em' }}>
                DETAILS
              </th>
            </tr>
          </thead>
          <tbody>
            {ORDERED_KEYS.map((key, idx) => {
              const param = parameters[key];
              const isMissing = !param || param.extracted_value === '—' || param.status === 'Missing from source';
              const isConflict = param?.conflict_status || param?.status === 'Conflicting';
              const val = param?.final_value || param?.extracted_value || '—';

              return (
                <tr
                  key={key}
                  style={{
                    backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <td style={{
                    padding: '0.65rem 1rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    verticalAlign: 'top',
                  }}>
                    {param?.display_name || key}
                  </td>
                  <td style={{
                    padding: '0.65rem 1rem',
                    color: isMissing ? '#94a3b8' : '#0f172a',
                    border: '1px solid #e2e8f0',
                    verticalAlign: 'top',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}>
                    {isConflict && (
                      <div style={{ color: '#c2410c', fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
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

        <div style={{
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: '#94a3b8',
          fontStyle: 'italic',
          textAlign: 'center',
        }}>
          Note: Summary strictly confined to the 12 predefined parameters extracted from source evidence. Conflicting parameters require human review.
        </div>
      </div>
    </div>
  );
};

