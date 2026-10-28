import React, { useState, useEffect } from 'react';
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

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await apiClient.getDashboard();
      setStats(data);
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchActiveRecord = async (docId: string) => {
    setLoadingRecord(true);
    try {
      const rec = await apiClient.getTenderDetails(docId);
      setActiveRecord(rec);
    } catch (e) {
      console.error('Error fetching document record:', e);
    } finally {
      setLoadingRecord(false);
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

  const handleUploadSuccess = (docId: string) => {
    setActiveDocId(docId);
    setCurrentTab('status');
    fetchStats();
  };

  const handleSelectDocument = (docId: string) => {
    setActiveDocId(docId);
    fetchActiveRecord(docId);
    setCurrentTab('review');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
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
            onRefresh={fetchStats}
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

      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#64748b',
      }}>
        <div>
          Tender Analysis and Extraction Bot • Production Release v1.0.0
        </div>
        <div style={{ marginTop: '0.2rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          Constrained 12-parameter schema • Deterministic & LLM-Powered Evidence Verification • Audit-Grade Document Intelligence
        </div>
      </footer>
    </div>
  );
};

export default App;
