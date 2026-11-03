import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { UploadModal } from './components/UploadModal';
import { ProcessingStatus } from './components/ProcessingStatus';
import { ExtractionReview } from './components/ExtractionReview';
import { ResultsDownloads } from './components/ResultsDownloads';
import { apiClient } from './api/client';
import { DashboardStats, DocumentProcessingRecord } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'upload' | 'status' | 'review' | 'results'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeRecord, setActiveRecord] = useState<DocumentProcessingRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState<boolean>(false);
  const activeDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeDocIdRef.current = activeDocId;
  }, [activeDocId]);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoadingStats(true);
    try {
      const data = await apiClient.getDashboard();
      setStats(data);
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      if (!silent) setLoadingStats(false);
    }
  };

  const fetchActiveRecord = async (docId: string, silent = false) => {
    if (!silent) setLoadingRecord(true);
    try {
      const rec = await apiClient.getTenderDetails(docId);
      setActiveRecord(rec);
    } catch (e) {
      console.error('Error fetching document record:', e);
    } finally {
      if (!silent) setLoadingRecord(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeDocId) {
      fetchActiveRecord(activeDocId);
    }
  }, [activeDocId]);

  // Real-time WebSocket connection for automatic live refreshes
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isUnmounted = false;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.port === '5173' ? 'localhost:8000' : window.location.host;
        const wsUrl = `${protocol}//${host}/api/ws`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WebSocket] Real-time event listener connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WebSocket] Event received:', data);

            // Auto-refresh dashboard stats
            fetchStats(true);

            // Auto-refresh active document details if impacted
            if (activeDocIdRef.current && data.document_id === activeDocIdRef.current) {
              if (data.type === 'document_deleted') {
                setActiveDocId(null);
                setActiveRecord(null);
                setCurrentTab('dashboard');
              } else {
                fetchActiveRecord(activeDocIdRef.current, true);
              }
            }
          } catch (e) {
            // ping/pong or non-JSON message
          }
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    // Fallback periodic auto-refresh every 4 seconds to guarantee zero manual refresh needed
    const interval = setInterval(() => {
      fetchStats(true);
      if (activeDocIdRef.current) {
        fetchActiveRecord(activeDocIdRef.current, true);
      }
    }, 4000);

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const handleUploadSuccess = (docId: string) => {
    setActiveDocId(docId);
    setCurrentTab('status');
    fetchStats();
  };

  const handleSelectDocument = (docId: string, preferredTab: 'review' | 'results' = 'review') => {
    setActiveDocId(docId);
    fetchActiveRecord(docId);
    setCurrentTab(preferredTab);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeDocId={activeDocId}
        hasConflicts={activeRecord?.has_conflicts}
      />

      <main style={{ flexGrow: 1, paddingBottom: '3rem' }}>
        {currentTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            loading={loadingStats}
            onRefresh={() => fetchStats()}
            onSelectDocument={handleSelectDocument}
            onGoToUpload={() => setCurrentTab('upload')}
          />
        )}

        {currentTab === 'upload' && (
          <UploadModal
            onUploadSuccess={handleUploadSuccess}
            onCancel={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'status' && activeDocId && (
          <ProcessingStatus
            documentId={activeDocId}
            onProceedToReview={() => {
              fetchActiveRecord(activeDocId);
              setCurrentTab('review');
            }}
            onProceedToResults={() => {
              fetchActiveRecord(activeDocId);
              setCurrentTab('results');
            }}
          />
        )}

        {currentTab === 'review' && activeRecord && (
          <ExtractionReview
            record={activeRecord}
            onRefresh={() => fetchActiveRecord(activeRecord.document_id)}
            onProceedToResults={() => setCurrentTab('results')}
          />
        )}

        {currentTab === 'results' && activeRecord && (
          <ResultsDownloads
            record={activeRecord}
            onGoToReview={() => setCurrentTab('review')}
            onGoToDashboard={() => {
              fetchStats();
              setCurrentTab('dashboard');
            }}
            onRefresh={() => fetchActiveRecord(activeRecord.document_id)}
          />
        )}
      </main>

      <footer className="glass-footer" style={{
        padding: '1.25rem 1.5rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#475569',
      }}>
        <div style={{ fontWeight: 500 }}>
          Tender Docs Analysis and Extraction Bot • Production Release v1.0.0
        </div>
        <div style={{ marginTop: '0.2rem', fontSize: '0.75rem', color: '#64748b' }}>
          Constrained 12-parameter schema • Deterministic & LLM-Powered Evidence Verification • Audit-Grade Document Intelligence
        </div>
      </footer>
    </div>
  );
};

export default App;
