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
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Document Processing Pipeline
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
              Tender: <span style={{ color: '#1e3a8a' }}>{documentId}</span>
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: isComplete ? '#dcfce7' : (hasError ? '#fee2e2' : '#eff6ff'),
              color: isComplete ? '#166534' : (hasError ? '#991b1b' : '#1e40af'),
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
            backgroundColor: '#e2e8f0',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${statusData?.stage_progress_pct ?? 10}%`,
              height: '100%',
              backgroundColor: hasError ? '#dc2626' : (statusData?.has_conflicts ? '#ea580c' : '#1e3a8a'),
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* 8-Stage Roadmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {STAGES.map((stage, idx) => {
            const isFinished = statusData?.stages_completed?.includes(stage.id) || (isComplete && idx <= currentStageIndex);
            const isCurrent = statusData?.current_stage === stage.id;
            const isPending = !isFinished && !isCurrent;

            return (
              <div
                key={stage.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${isCurrent ? '#bfdbfe' : (isFinished ? '#e2e8f0' : '#f1f5f9')}`,
                  backgroundColor: isCurrent ? '#f0f7ff' : (isFinished ? '#ffffff' : '#f8fafc'),
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Stage Icon */}
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: isFinished ? '#16a34a' : (isCurrent ? '#1e3a8a' : '#cbd5e1'),
                  color: '#ffffff',
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
                      fontWeight: 600,
                      color: isPending ? '#94a3b8' : '#0f172a',
                    }}>
                      Stage {idx + 1}: {stage.name}
                    </div>

                    {isFinished && (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                        Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 600 }} className="pulsing">
                        Executing...
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: isPending ? '#94a3b8' : '#64748b', marginTop: '0.2rem' }}>
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
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#ffedd5',
            border: '1px solid #fdba74',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            color: '#9a3412',
          }}>
            <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Clause Contradictions Detected
              </div>
              <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
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
          borderTop: '1px solid #f1f5f9',
          paddingTop: '1.25rem',
        }}>
          {statusData?.requires_human_review ? (
            <button
              onClick={onProceedToReview}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <FileSearch size={16} />
              Review Conflicting Statements
              <ArrowRight size={16} />
            </button>
          ) : isComplete ? (
            <button
              onClick={onProceedToResults}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                backgroundColor: '#1e3a8a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <FileText size={16} />
              View Verified Summary
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              disabled
              style={{
                padding: '0.65rem 1.25rem',
                backgroundColor: '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
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
