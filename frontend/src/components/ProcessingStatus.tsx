import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, AlertCircle,
  FileText, ArrowRight, RefreshCw, FileSearch, Check,
  Cpu, ShieldAlert, Sparkles
} from 'lucide-react';
import { apiClient } from '../api/client';

interface ProcessingStatusProps {
  documentId: string;
  onProceedToReview: () => void;
  onProceedToResults: () => void;
}

const STAGES = [
  { id: 'File uploaded', name: 'File Uploaded', desc: 'Secure document storage and metadata registration' },
  { id: 'Document parsed', name: 'Document Parsed', desc: 'Native text, paragraph, heading, and table extraction' },
  { id: 'OCR completed where necessary', name: 'OCR Evaluation', desc: 'Scanned image page detection and optical text recognition' },
  { id: 'Parameters extracted', name: 'Parameters Extracted', desc: 'Targeted retrieval across all 12 predefined fields' },
  { id: 'Evidence verified', name: 'Evidence Verified', desc: 'Exact and fuzzy source page citation verification' },
  { id: 'Conflicts and missing values checked', name: 'Conflict & Inconsistency Check', desc: 'Cross-clause contradiction and date discrepancy detection' },
  { id: 'Human review required', name: 'Human Review', desc: 'Escalation for unverified or contradictory statements' },
  { id: 'Word report generated', name: 'Word & Log Artifacts Created', desc: 'Production of .docx Executive Summary and .xlsx Verification Log' },
];

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  documentId,
  onProceedToReview,
  onProceedToResults,
}) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await apiClient.getTenderStatus(documentId);
      setStatusData(data);
      setLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error checking status');
      setLoading(false);
      return null;
    }
  };

  useEffect(() => {
    let interval: any = null;
    fetchStatus();

    interval = setInterval(async () => {
      const data = await fetchStatus();
      if (data && (data.current_stage === 'Word report generated' || data.error_message)) {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [documentId]);

  const currentStageIndex = STAGES.findIndex(s => s.id === statusData?.current_stage);
  const isComplete = statusData?.current_stage === 'Word report generated';
  const hasError = !!statusData?.error_message;

  return (
    <div style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div className="glass-panel" style={{
        padding: '2.5rem',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
          paddingBottom: '1.25rem',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Document Processing Pipeline
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '0.2rem' }}>
              Tender: <span style={{ color: '#1e3a8a' }}>{documentId}</span>
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.4rem 0.95rem',
              borderRadius: '9999px',
              backgroundColor: isComplete ? 'rgba(220, 252, 231, 0.85)' : (hasError ? 'rgba(254, 226, 226, 0.85)' : 'rgba(239, 246, 255, 0.85)'),
              color: isComplete ? '#166534' : (hasError ? '#991b1b' : '#1e40af'),
              border: isComplete ? '1px solid rgba(134, 239, 172, 0.8)' : (hasError ? '1px solid rgba(254, 202, 202, 0.8)' : '1px solid rgba(191, 219, 254, 0.8)'),
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(31, 38, 135, 0.05)',
            }}>
              {isComplete ? 'Processing Complete' : (hasError ? 'Processing Error' : `${statusData?.stage_progress_pct ?? 0}% In Progress`)}
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: 'rgba(226, 232, 240, 0.7)',
            borderRadius: '9999px',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: `${statusData?.stage_progress_pct ?? 10}%`,
              height: '100%',
              background: hasError
                ? 'linear-gradient(90deg, #dc2626, #f87171)'
                : (statusData?.has_conflicts
                  ? 'linear-gradient(90deg, #ea580c, #fb923c)'
                  : 'linear-gradient(90deg, #1e3a8a, #3b82f6)'),
              boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* 8-Stage Roadmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {STAGES.map((stage, idx) => {
            const isFinished = statusData?.stages_completed?.includes(stage.id) || (isComplete && idx <= currentStageIndex);
            const isCurrent = statusData?.current_stage === stage.id;
            const isPending = !isFinished && !isCurrent;

            return (
              <div
                key={stage.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '0.95rem 1.15rem',
                  borderRadius: '0.65rem',
                  border: isCurrent
                    ? '1.5px solid rgba(59, 130, 246, 0.85)'
                    : (isFinished ? '1px solid rgba(255, 255, 255, 0.8)' : '1px solid rgba(226, 232, 240, 0.6)'),
                  backgroundColor: isCurrent
                    ? 'rgba(239, 246, 255, 0.75)'
                    : (isFinished ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.35)'),
                  boxShadow: isCurrent
                    ? '0 6px 20px rgba(37, 99, 235, 0.12), 0 0 0 2px rgba(59, 130, 246, 0.2)'
                    : '0 2px 6px rgba(31, 38, 135, 0.03)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Stage Icon */}
                <div style={{
                  width: '2.1rem',
                  height: '2.1rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: isFinished ? '#16a34a' : (isCurrent ? '#1e3a8a' : 'rgba(203, 213, 225, 0.7)'),
                  color: '#ffffff',
                  boxShadow: isCurrent ? '0 0 10px rgba(30, 58, 138, 0.4)' : 'none',
                }}>
                  {isFinished ? (
                    <Check size={16} />
                  ) : isCurrent ? (
                    <RefreshCw size={14} className="pulsing" />
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{idx + 1}</span>
                  )}
                </div>

                {/* Stage Text */}
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: isPending ? '#94a3b8' : '#0f172a',
                    }}>
                      Stage {idx + 1}: {stage.name}
                    </div>

                    {isFinished && (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                        Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700 }} className="pulsing">
                        Executing...
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: isPending ? '#94a3b8' : '#64748b', marginTop: '0.2rem', fontWeight: 500 }}>
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conflict / Warning Alert Banner */}
        {statusData?.has_conflicts && (
          <div style={{
            marginTop: '1.75rem',
            padding: '1.1rem 1.25rem',
            backgroundColor: 'rgba(255, 237, 213, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(253, 186, 116, 0.9)',
            borderRadius: '0.65rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            color: '#9a3412',
            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
          }}>
            <ShieldAlert size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                Clause Contradictions Detected
              </div>
              <p style={{ fontSize: '0.825rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
                The evidence verification engine identified conflicting terms (such as differing delivery schedules or bid deadlines) across sections. Human review is required before final sign-off.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          marginTop: '2rem',
          borderTop: '1px solid rgba(226, 232, 240, 0.7)',
          paddingTop: '1.25rem',
        }}>
          {statusData?.requires_human_review ? (
            <button
              onClick={onProceedToReview}
              className="glass-btn-primary"
              style={{
                background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                padding: '0.65rem 1.5rem',
              }}
            >
              <FileSearch size={16} />
              Review Conflicting Statements
              <ArrowRight size={16} />
            </button>
          ) : isComplete ? (
            <button
              onClick={onProceedToResults}
              className="glass-btn-primary"
              style={{
                padding: '0.65rem 1.5rem',
              }}
            >
              <FileText size={16} />
              View Verified Summary
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              disabled
              className="glass-btn-secondary"
              style={{
                opacity: 0.6,
                cursor: 'not-allowed',
              }}
            >
              Processing document...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

