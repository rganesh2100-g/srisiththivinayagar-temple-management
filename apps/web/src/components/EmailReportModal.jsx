import React, { useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import './EmailReportModal.css';

/**
 * EmailReportModal Component
 * 
 * Modal for admins to generate and email donation reports.
 * Allows filtering by status, category, and date range.
 */
export default function EmailReportModal({ isOpen, onClose, donations = [] }) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    dateRange: '',
  });
  const [sending, setSending] = useState(false);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSendReport = async () => {
    // Validate email
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setSending(true);

      const response = await apiServerClient.fetch('/donations/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientEmail,
          filters: {
            status: filters.status || undefined,
            category: filters.category || undefined,
            dateRange: filters.dateRange || undefined,
          }
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to send report');
      }

      toast.success(`Report sent successfully to ${recipientEmail}`);

      // Reset form and close modal
      setRecipientEmail('');
      setFilters({
        status: '',
        category: '',
        dateRange: '',
      });
      onClose();
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error(error.message || 'Failed to send report');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  // Get unique categories from donations
  const categories = [...new Set(donations.map(d => d.category || 'General Fund'))].sort();
  const statuses = ['pending', 'approved', 'rejected'];

  return (
    <div className="email-report-modal-overlay" onClick={onClose}>
      <div className="email-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Donation Report</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label htmlFor="recipient-email">Recipient Email Address *</label>
            <input
              id="recipient-email"
              type="email"
              placeholder="admin@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="filters-section">
            <h3>Filters (Optional)</h3>

            <div className="form-group">
              <label htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                disabled={sending}
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category-filter">Category</label>
              <select
                id="category-filter"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                disabled={sending}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date-range">Date Range</label>
              <input
                id="date-range"
                type="text"
                placeholder="e.g., 2024-01-01 to 2024-12-31"
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                disabled={sending}
              />
            </div>
          </div>

          <div className="report-summary">
            <p>
              <strong>Total Donations:</strong> {donations.length}
            </p>
            <p>
              <strong>Total Amount:</strong> €{donations.reduce((sum, d) => sum + (d.amount || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-cancel"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className="btn btn-send"
            onClick={handleSendReport}
            disabled={sending || !recipientEmail}
          >
            {sending ? 'Sending...' : 'Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
}