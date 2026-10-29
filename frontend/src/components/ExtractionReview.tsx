import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, AlertOctagon, Edit3,
  Check, Flag, ArrowRight, FileText, CornerDownRight,
  Eye, RefreshCw, ShieldCheck, Download
} from 'lucide-react';
import {
  DocumentProcessingRecord, ParameterExtraction,
  ReviewSubmitItem, ParameterKey, ConflictDetail
} from '../types';
import { apiClient } from '../api/client';

interface ExtractionReviewProps {
  record: DocumentProcessingRecord;
  onRefresh: () => void;
  onProceedToResults: () => void;
}

export const ExtractionReview: React.FC<ExtractionReviewProps> = ({
  record,
  onRefresh,
  onProceedToResults,
}) => {
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [correctedValues, setCorrectedValues] = useState<Record<string, string>>({});
  const [reviewerComments, setReviewerComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictDetail | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('✓ Changes saved & reports regenerated!');
  const [rechecking, setRechecking] = useState(false);

  const handleRecheckDocument = async () => {
    setRechecking(true);
    try {
      await apiClient.regenerateReports(record.document_id, true);
      onRefresh();
      setSuccessMessage('✓ Uploaded document re-checked & reports regenerated!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      alert('Error re-checking document with original source file.');
    } finally {
      setRechecking(false);
    }
  };

  const parameters = record.parameters || {};

  const handleApprove = async (paramKey: ParameterKey) => {
    setSubmitting(true);
    try {
      const items: ReviewSubmitItem[] = [{
        parameter_key: paramKey,
        action: 'approve',
        reviewer_comment: reviewerComments[paramKey] || 'Approved by reviewer',
      }];
      await apiClient.submitReview(record.document_id, items);
      await apiClient.regenerateReports(record.document_id, false);
      onRefresh();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error approving parameter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlag = async (paramKey: ParameterKey) => {
    setSubmitting(true);
    try {
      const items: ReviewSubmitItem[] = [{
        parameter_key: paramKey,
        action: 'flag',
        reviewer_comment: reviewerComments[paramKey] || 'Flagged for procurement officer review',
      }];
      await apiClient.submitReview(record.document_id, items);
      await apiClient.regenerateReports(record.document_id, false);
      onRefresh();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error flagging parameter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCorrection = async (paramKey: ParameterKey) => {
    const newVal = correctedValues[paramKey];
    if (!newVal || !newVal.trim()) {
      alert('Please enter a corrected value.');
      return;
    }

    setSubmitting(true);
    try {
      const items: ReviewSubmitItem[] = [{
        parameter_key: paramKey,
        action: 'edit',
        corrected_value: newVal.trim(),
        reviewer_comment: reviewerComments[paramKey] || 'Corrected by reviewer',
      }];
      await apiClient.submitReview(record.document_id, items);
      await apiClient.regenerateReports(record.document_id, false);
      setEditingParam(null);
      onRefresh();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error saving correction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Top Banner */}
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
            Extraction & Evidence Verification Audit
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Tender: <strong style={{ color: '#1e3a8a' }}>{record.document_id}</strong> ({record.original_filename}) • {record.page_count} Pages Analyzed
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {saveSuccess && (
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              {successMessage}
            </span>
          )}

          <button
            type="button"
            onClick={handleRecheckDocument}
            disabled={rechecking || submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: rechecking ? 'not-allowed' : 'pointer',
              opacity: rechecking ? 0.7 : 1,
            }}
            title="Re-check the original uploaded document, re-extract and verify all 12 parameters"
          >
            <RefreshCw size={15} className={rechecking ? 'pulsing' : ''} />
            {rechecking ? 'Re-checking Document...' : 'Re-check Document'}
          </button>

          <button
            onClick={onProceedToResults}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.25rem',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <FileText size={16} />
            Generate Word Report
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Side-by-Side Conflict Inspection Box if any conflict is selected or detected */}
      {record.conflicts && record.conflicts.length > 0 && (
        <div style={{
          backgroundColor: '#fff7ed',
          border: '1px solid #fdba74',
          borderRadius: '0.5rem',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertOctagon size={20} color="#c2410c" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#9a3412' }}>
              Material Contradictions Detected ({record.conflicts.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {record.conflicts.map((conf, cIdx) => (
              <div key={cIdx} style={{
                backgroundColor: '#ffffff',
                border: '1px solid #fed7aa',
                borderRadius: '0.375rem',
                padding: '1rem',
              }}>
                <div style={{ fontWeight: 700, color: '#9a3412', fontSize: '0.95rem' }}>
                  Parameter: {conf.parameter_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {conf.description}
                </div>

                {/* Side by side cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  marginTop: '0.75rem',
                }}>
                  {conf.statements.map((stmt, sIdx) => (
                    <div key={sIdx} style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      padding: '0.85rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#1e3a8a',
                          color: '#fff',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                        }}>
                          Statement {sIdx + 1} • Page {stmt.source_page}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                        "{stmt.value}"
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#475569',
                        fontStyle: 'italic',
                        backgroundColor: '#ffffff',
                        borderLeft: '3px solid #cbd5e1',
                        padding: '0.4rem 0.6rem',
                        marginTop: '0.5rem',
                      }}>
                        Source Excerpt: "{stmt.source_excerpt}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12 Parameters Review Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Object.values(parameters).map((param) => {
          const isConflict = param.conflict_status || param.status === 'Conflicting';
          const isMissing = param.status === 'Missing from source' || param.extracted_value === '—';
          const isVerified = param.status === 'Verified';
          const isEditing = editingParam === param.parameter_key;

          return (
            <div
              key={param.parameter_key}
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${isConflict ? '#fdba74' : (isVerified ? '#bbf7d0' : '#e2e8f0')}`,
                borderRadius: '0.5rem',
                padding: '1.25rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    {param.display_name}
                  </span>

                  {/* Status Pill */}
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    backgroundColor: isVerified ? '#dcfce7' : (isConflict ? '#ffedd5' : (isMissing ? '#f1f5f9' : '#fef3c7')),
                    color: isVerified ? '#166534' : (isConflict ? '#c2410c' : (isMissing ? '#64748b' : '#92400e')),
                  }}>
                    {param.status}
                  </span>

                  {/* Confidence */}
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                  }}>
                    Confidence: <strong>{param.confidence_indicator}</strong> ({Math.round(param.confidence_score * 100)}%)
                  </span>
                </div>

                {/* Page Badge */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {param.source_pages && param.source_pages.length > 0 ? (
                    param.source_pages.map((p) => (
                      <span key={p} style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#eff6ff',
                        color: '#1e40af',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.25rem',
                      }}>
                        Page {p}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No citation</span>
                  )}
                </div>
              </div>

              {/* Body: Extracted Value & Source Excerpt */}
              <div style={{ marginTop: '0.85rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Extracted Value:
                </div>
                
                {isEditing ? (
                  <div style={{ marginTop: '0.4rem' }}>
                    <textarea
                      value={correctedValues[param.parameter_key] ?? (param.final_value || param.extracted_value)}
                      onChange={(e) => setCorrectedValues({
                        ...correctedValues,
                        [param.parameter_key]: e.target.value,
                      })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        border: '1px solid #94a3b8',
                        borderRadius: '0.375rem',
                        fontSize: '0.9rem',
                        color: '#0f172a',
                      }}
                    />
                    <div style={{ marginTop: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="Reviewer rationale / audit comment (e.g. Verified with Clause 4.2)"
                        value={reviewerComments[param.parameter_key] || ''}
                        onChange={(e) => setReviewerComments({
                          ...reviewerComments,
                          [param.parameter_key]: e.target.value,
                        })}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.6rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: isMissing ? '#94a3b8' : (isConflict ? '#c2410c' : '#0f172a'),
                    marginTop: '0.25rem',
                    lineHeight: 1.5,
                  }}>
                    {param.final_value || param.extracted_value}
                  </div>
                )}

                {/* Supporting Text Excerpt */}
                {param.exact_supporting_text && (
                  <div style={{
                    marginTop: '0.65rem',
                    backgroundColor: '#f8fafc',
                    borderLeft: '3px solid #cbd5e1',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.825rem',
                    color: '#475569',
                    fontStyle: 'italic',
                  }}>
                    <span style={{ fontWeight: 600, fontStyle: 'normal', color: '#334155' }}>Source Evidence: </span>
                    "{param.exact_supporting_text}"
                  </div>
                )}

                {/* Warning note if present */}
                {param.review_reason && (
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    <AlertTriangle size={14} />
                    <span>{param.review_reason}</span>
                  </div>
                )}
              </div>

              {/* Reviewer Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                borderTop: '1px solid #f8fafc',
                paddingTop: '0.75rem',
              }}>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setEditingParam(null)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        color: '#475569',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveCorrection(param.parameter_key)}
                      disabled={submitting}
                      style={{
                        padding: '0.4rem 0.85rem',
                        backgroundColor: '#16a34a',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        color: '#ffffff',
                        fontWeight: 600,
                      }}
                    >
                      Save Correction
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingParam(param.parameter_key);
                        setCorrectedValues({
                          ...correctedValues,
                          [param.parameter_key]: param.final_value || param.extracted_value,
                        });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.35rem 0.75rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        color: '#334155',
                        fontWeight: 500,
                      }}
                    >
                      <Edit3 size={14} />
                      Edit Value
                    </button>

                    <button
                      onClick={() => handleFlag(param.parameter_key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.35rem 0.75rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #fde047',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        color: '#854d0e',
                        fontWeight: 500,
                      }}
                    >
                      <Flag size={14} />
                      Flag
                    </button>

                    <button
                      onClick={() => handleApprove(param.parameter_key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.35rem 0.85rem',
                        backgroundColor: '#dcfce7',
                        border: '1px solid #86efac',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        color: '#166534',
                        fontWeight: 600,
                      }}
                    >
                      <Check size={14} />
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

