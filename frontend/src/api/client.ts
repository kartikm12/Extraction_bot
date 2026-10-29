import { DashboardStats, DocumentProcessingRecord, ReviewSubmitItem } from '../types';

const API_BASE = '/api';

export const apiClient = {
  async getDashboard(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  async uploadTender(file: File): Promise<{ document_id: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/tenders/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async getTenderStatus(documentId: string): Promise<{
    document_id: string;
    current_stage: string;
    stage_progress_pct: number;
    stages_completed: string[];
    has_conflicts: boolean;
    has_missing_values: boolean;
    requires_human_review: boolean;
    is_fully_verified: boolean;
    error_message?: string;
  }> {
    const res = await fetch(`${API_BASE}/tenders/${documentId}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  },

  async getTenderDetails(documentId: string): Promise<DocumentProcessingRecord> {
    const res = await fetch(`${API_BASE}/tenders/${documentId}`);
    if (!res.ok) throw new Error('Failed to fetch tender details');
    return res.json();
  },

  async submitReview(documentId: string, reviews: ReviewSubmitItem[]): Promise<any> {
    const res = await fetch(`${API_BASE}/tenders/${documentId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: documentId, reviews }),
    });
    if (!res.ok) throw new Error('Failed to submit review');
    return res.json();
  },

  async regenerateReports(documentId: string, recheck: boolean = true): Promise<any> {
    const res = await fetch(`${API_BASE}/tenders/${documentId}/regenerate?recheck=${recheck}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to regenerate reports');
    return res.json();
  },

  async deleteTender(documentId: string): Promise<{ message: string; document_id: string }> {
    const res = await fetch(`${API_BASE}/tenders/${documentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete tender' }));
      throw new Error(err.detail || 'Failed to delete tender');
    }
    return res.json();
  },

  getWordDownloadUrl(documentId: string): string {
    return `${API_BASE}/tenders/${documentId}/download/word`;
  },

  getXlsxDownloadUrl(documentId: string): string {
    return `${API_BASE}/tenders/${documentId}/download/xlsx`;
  },

  getJsonDownloadUrl(documentId: string): string {
    return `${API_BASE}/tenders/${documentId}/download/json`;
  },
};

