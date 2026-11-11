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
      const param = parameters[paramKey];
      let approvedVal = param?.final_value || param?.extracted_value || '';
      if (approvedVal.startsWith('[CONFLICT')) {
        if (param?.conflict_details && param.conflict_details[0]?.statements?.length > 0) {
          approvedVal = param.conflict_details[0].statements[0].value;
        } else {
          approvedVal = approvedVal.replace(/^\[CONFLICT[ -][^\]]+\]\s*(?:Multiple contradictory values found:\s*)?/i, '').trim();
        }
      }
      const items: ReviewSubmitItem[] = [{
        parameter_key: paramKey,
        action: 'approve',
        corrected_value: approvedVal,
        reviewer_comment: reviewerComments[paramKey] || 'Approved by reviewer',
      }];
      await apiClient.submitReview(record.document_id, items);
      await apiClient.regenerateReports(record.document_id, false);
      onRefresh();
      setSuccessMessage('✓ Approved & reports regenerated!');
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

  const handleSaveCorrectionWithValue = async (paramKey: ParameterKey, valueToUse: string, comment = 'Resolved by reviewer') => {
    setSubmitting(true);
    try {
      const items: ReviewSubmitItem[] = [{
        parameter_key: paramKey,
        action: 'edit',
        corrected_value: valueToUse.trim(),
        reviewer_comment: comment,
      }];
      await apiClient.submitReview(record.document_id, items);
      await apiClient.regenerateReports(record.document_id, false);
      setEditingParam(null);
      onRefresh();
      setSuccessMessage('✓ Conflict resolved & reports regenerated!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      alert('Error saving correction');
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
    await handleSaveCorrectionWithValue(paramKey, newVal, reviewerComments[paramKey] || 'Corrected by reviewer');
  };

  const startEditParam = (param: ParameterExtraction) => {
    setEditingParam(param.parameter_key);
    let cleanInitial = param.final_value || param.extracted_value || '';
    if (!param.final_value && cleanInitial.startsWith('[CONFLICT')) {
      if (param.conflict_details && param.conflict_details[0]?.statements?.length > 0) {
        cleanInitial = param.conflict_details[0].statements[0].value;
      } else {
        cleanInitial = cleanInitial.replace(/^\[CONFLICT[ -][^\]]+\]\s*(?:Multiple contradictory values found:\s*)?/i, '').trim();
      }
    }
    setCorrectedValues({
      ...correctedValues,
      [param.parameter_key]: cleanInitial,
    });
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Extraction & Evidence Verification Audit
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
            Tender: <strong style={{ color: '#1e3a8a' }}>{record.document_id}</strong> ({record.original_filename}) • {record.page_count} Pages Analyzed
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {saveSuccess && (
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
              {successMessage}
            </span>
          )}

          <button
            type="button"
            onClick={handleRecheckDocument}
            disabled={rechecking || submitting}
            className="glass-btn-secondary"
            title="Re-check the original uploaded document, re-extract and verify all 12 parameters"
          >
            <RefreshCw size={15} className={rechecking ? 'pulsing' : ''} />
            {rechecking ? 'Re-checking Document...' : 'Re-check Document'}
          </button>

          <button
            onClick={onProceedToResults}
            className="glass-btn-primary"
          >
            <FileText size={16} />
            Generate Word Report
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Side-by-Side Conflict Inspection Box if any conflict is selected or detected */}
      {record.conflicts && record.conflicts.length > 0 && (
        <div className="glass-panel" style={{
          backgroundColor: 'rgba(255, 237, 213, 0.85)',
          border: '1px solid rgba(253, 186, 116, 0.85)',
          padding: '1.5rem',
          marginBottom: '1.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <AlertOctagon size={22} color="#c2410c" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#9a3412', letterSpacing: '-0.02em' }}>
              Material Contradictions Detected ({record.conflicts.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {record.conflicts.map((conf, cIdx) => (
              <div key={cIdx} className="glass-card" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                borderColor: 'rgba(254, 215, 170, 0.9)',
                padding: '1.15rem',
              }}>
                <div style={{ fontWeight: 800, color: '#9a3412', fontSize: '1rem' }}>
                  Parameter: {conf.parameter_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>
                  {conf.description}
                </div>

                {/* Side by side cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  marginTop: '0.85rem',
                }}>
                  {conf.statements.map((stmt, sIdx) => (
                    <div key={sIdx} className="glass-card" style={{
                      backgroundColor: 'rgba(248, 250, 252, 0.75)',
                      padding: '0.95rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#1e3a8a',
                          color: '#fff',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                        }}>
                          Statement {sIdx + 1} • Page {stmt.source_page}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginTop: '0.55rem' }}>
                        "{stmt.value}"
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#475569',
                        fontStyle: 'italic',
                        backgroundColor: 'rgba(255, 255, 255, 0.85)',
                        borderLeft: '3px solid #3b82f6',
                        padding: '0.45rem 0.65rem',
                        marginTop: '0.55rem',
                        borderRadius: '0 0.25rem 0.25rem 0',
                      }}>
                        Source Excerpt: "{stmt.source_excerpt}"
                      </div>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSaveCorrectionWithValue(
                          conf.parameter_key as ParameterKey,
                          stmt.value,
                          `Resolved conflict by selecting Page ${stmt.source_page} value`
                        )}
                        className="glass-btn-secondary"
                        style={{
                          marginTop: '0.75rem',
                          fontSize: '0.75rem',
                          padding: '0.35rem 0.65rem',
                          width: '100%',
                          justifyContent: 'center',
                          color: '#1e40af',
                          fontWeight: 700,
                        }}
                      >
                        <Check size={14} />
                        Use Page {stmt.source_page} Value & Resolve Conflict
                      </button>
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
          const isReviewed = Boolean(param.final_value || param.reviewer_decision);
          const isConflict = !isReviewed && (param.conflict_status || param.status === 'Conflicting');
          const isMissing = param.status === 'Missing from source' || param.extracted_value === '—';
          const isVerified = param.status === 'Verified' || isReviewed;
          const isEditing = editingParam === param.parameter_key;

          let displayVal = param.final_value || param.extracted_value || '—';
          if (isReviewed && displayVal.startsWith('[CONFLICT')) {
            displayVal = displayVal.replace(/^\[CONFLICT[ -][^\]]+\]\s*(?:Multiple contradictory values found:\s*)?/i, '').trim();
          }

          return (
            <div
              key={param.parameter_key}
              className="glass-card glass-card-interactive"
              style={{
                border: isConflict
                  ? '1.5px solid rgba(251, 146, 60, 0.8)'
                  : (isVerified ? '1.5px solid rgba(134, 239, 172, 0.8)' : '1px solid rgba(255, 255, 255, 0.8)'),
                padding: '1.35rem',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.6rem',
                borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                paddingBottom: '0.85rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {param.display_name}
                  </span>

                  {/* Status Pill */}
                  <span className={isVerified ? 'glass-badge-verified' : (isConflict ? 'glass-badge-conflict' : (isMissing ? 'glass-badge-missing' : 'glass-badge-review'))} style={{
                    fontSize: '0.725rem',
                    padding: '0.25rem 0.65rem',
                  }}>
                    {param.status}
                  </span>

                  {/* Confidence */}
                  <span style={{
                    fontSize: '0.775rem',
                    color: '#64748b',
                    fontWeight: 500,
                  }}>
                    Confidence: <strong style={{ color: '#1e293b' }}>{param.confidence_indicator}</strong> ({Math.round(param.confidence_score * 100)}%)
                  </span>
                </div>

                {/* Page Badge */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {param.source_pages && param.source_pages.length > 0 ? (
                    param.source_pages.map((p) => (
                      <span key={p} style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(239, 246, 255, 0.85)',
                        color: '#1e40af',
                        border: '1px solid rgba(191, 219, 254, 0.8)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '0.35rem',
                        backdropFilter: 'blur(4px)',
                      }}>
                        Page {p}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No citation</span>
                  )}
                </div>
              </div>

              {/* Body: Extracted Value & Source Excerpt */}
              <div style={{ marginTop: '0.95rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Extracted Value:
                </div>
                
                {isEditing ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <textarea
                      value={correctedValues[param.parameter_key] ?? (param.final_value || param.extracted_value)}
                      onChange={(e) => setCorrectedValues({
                        ...correctedValues,
                        [param.parameter_key]: e.target.value,
                      })}
                      rows={3}
                      className="glass-textarea"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.9rem',
                      }}
                    />
                    <div style={{ marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Reviewer rationale / audit comment (e.g. Verified with Clause 4.2)"
                        value={reviewerComments[param.parameter_key] || ''}
                        onChange={(e) => setReviewerComments({
                          ...reviewerComments,
                          [param.parameter_key]: e.target.value,
                        })}
                        className="glass-input"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: isMissing ? '#94a3b8' : (isConflict ? '#c2410c' : '#0f172a'),
                    marginTop: '0.35rem',
                    lineHeight: 1.55,
                  }}>
                    {displayVal}
                  </div>
                )}

                {/* Supporting Text Excerpt */}
                {param.exact_supporting_text && (
                  <div style={{
                    marginTop: '0.75rem',
                    backgroundColor: 'rgba(248, 250, 252, 0.75)',
                    backdropFilter: 'blur(6px)',
                    borderLeft: '3px solid #3b82f6',
                    borderTop: '1px solid rgba(226, 232, 240, 0.5)',
                    borderRight: '1px solid rgba(226, 232, 240, 0.5)',
                    borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
                    borderRadius: '0 0.35rem 0.35rem 0',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.825rem',
                    color: '#475569',
                    fontStyle: 'italic',
                  }}>
                    <span style={{ fontWeight: 700, fontStyle: 'normal', color: '#1e3a8a' }}>Source Evidence: </span>
                    "{param.exact_supporting_text}"
                  </div>
                )}

                {/* Warning note if present */}
                {param.review_reason && (
                  <div style={{
                    marginTop: '0.6rem',
                    fontSize: '0.8rem',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontWeight: 500,
                  }}>
                    <AlertTriangle size={15} />
                    <span>{param.review_reason}</span>
                  </div>
                )}
              </div>

              {/* Reviewer Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.55rem',
                marginTop: '1.15rem',
                borderTop: '1px solid rgba(226, 232, 240, 0.6)',
                paddingTop: '0.85rem',
              }}>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setEditingParam(null)}
                      className="glass-btn-secondary"
                      style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveCorrection(param.parameter_key)}
                      disabled={submitting}
                      className="glass-btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #15803d, #16a34a)',
                        padding: '0.45rem 1rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      Save Correction
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditParam(param)}
                      className="glass-btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}
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
                        padding: '0.4rem 0.85rem',
                        backgroundColor: 'rgba(254, 243, 199, 0.8)',
                        border: '1px solid rgba(253, 224, 71, 0.85)',
                        borderRadius: '0.375rem',
                        fontSize: '0.825rem',
                        color: '#854d0e',
                        fontWeight: 600,
                        backdropFilter: 'blur(6px)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(254, 240, 138, 0.95)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(254, 243, 199, 0.8)';
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
                        padding: '0.4rem 0.95rem',
                        backgroundColor: 'rgba(220, 252, 231, 0.85)',
                        border: '1px solid rgba(134, 239, 172, 0.9)',
                        borderRadius: '0.375rem',
                        fontSize: '0.825rem',
                        color: '#15803d',
                        fontWeight: 700,
                        backdropFilter: 'blur(6px)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(187, 247, 208, 0.95)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(220, 252, 231, 0.85)';
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

