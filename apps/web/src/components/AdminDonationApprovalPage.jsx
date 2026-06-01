import { useState, useEffect } from 'react';
import { apiServerClient } from '../utils/apiServerClient';
import { showToast } from '../utils/toast';
import './AdminDonationApprovalPage.css';

/**
 * AdminDonationApprovalPage Component
 * 
 * Displays a list of pending donations and allows admins to approve them.
 * When approved, sends a confirmation email to the donor via SendGrid.
 */
export default function AdminDonationApprovalPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState({});
  const [adminNotes, setAdminNotes] = useState({});

  // Fetch pending donations on component mount
  useEffect(() => {
    fetchPendingDonations();
  }, []);

  const fetchPendingDonations = async () => {
    try {
      setLoading(true);
      const response = await apiServerClient.fetch('/donations');
      const allDonations = await response.json();
      
      // Filter for pending donations
      const pendingDonations = allDonations.filter(d => d.status === 'pending');
      setDonations(pendingDonations);
    } catch (error) {
      console.error('Failed to fetch donations:', error);
      showToast('Failed to load donations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDonation = async (donationId) => {
    try {
      setApproving(prev => ({ ...prev, [donationId]: true }));

      const response = await apiServerClient.fetch('/donations/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          donationId: donationId,
          status: 'approved',
          adminNotes: adminNotes[donationId] || '',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve donation');
      }

      // Show appropriate toast message
      if (result.emailSent) {
        showToast(
          `Donation approved and email sent to ${result.donorEmail || 'donor'}`,
          'success'
        );
      } else {
        showToast(
          `Donation approved but email failed - check logs. Error: ${result.error || 'Unknown error'}`,
          'warning'
        );
      }

      // Refresh the donations list
      await fetchPendingDonations();
      
      // Clear admin notes for this donation
      setAdminNotes(prev => {
        const updated = { ...prev };
        delete updated[donationId];
        return updated;
      });
    } catch (error) {
      console.error('Error approving donation:', error);
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setApproving(prev => ({ ...prev, [donationId]: false }));
    }
  };

  const handleRejectDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to reject this donation?')) {
      return;
    }

    try {
      setApproving(prev => ({ ...prev, [donationId]: true }));

      const response = await apiServerClient.fetch(`/donations/${donationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject donation');
      }

      showToast('Donation rejected', 'success');
      await fetchPendingDonations();
    } catch (error) {
      console.error('Error rejecting donation:', error);
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setApproving(prev => ({ ...prev, [donationId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="admin-donation-approval-page">
        <div className="loading">Loading donations...</div>
      </div>
    );
  }

  return (
    <div className="admin-donation-approval-page">
      <div className="page-header">
        <h1>Donation Approvals</h1>
        <p className="subtitle">Review and approve pending donations</p>
      </div>

      {donations.length === 0 ? (
        <div className="empty-state">
          <p>No pending donations to review</p>
        </div>
      ) : (
        <div className="donations-list">
          {donations.map(donation => (
            <div key={donation.id} className="donation-card">
              <div className="donation-header">
                <div className="donor-info">
                  <h3>{donation.donorName}</h3>
                  <p className="donor-email">{donation.donorEmail || 'No email provided'}</p>
                </div>
                <div className="donation-amount">
                  <span className="amount">${donation.amount.toFixed(2)}</span>
                  <span className="category">{donation.category || 'General Fund'}</span>
                </div>
              </div>

              {donation.message && (
                <div className="donation-message">
                  <p><strong>Message:</strong> {donation.message}</p>
                </div>
              )}

              <div className="donation-details">
                <div className="detail-item">
                  <span className="label">Donation Date:</span>
                  <span className="value">{new Date(donation.created).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span className="value status-badge pending">Pending</span>
                </div>
              </div>

              <div className="admin-notes">
                <textarea
                  placeholder="Add admin notes (optional)"
                  value={adminNotes[donation.id] || ''}
                  onChange={(e) => setAdminNotes(prev => ({
                    ...prev,
                    [donation.id]: e.target.value,
                  }))}
                  disabled={approving[donation.id]}
                />
              </div>

              <div className="donation-actions">
                <button
                  className="btn btn-approve"
                  onClick={() => handleApproveDonation(donation.id)}
                  disabled={approving[donation.id]}
                >
                  {approving[donation.id] ? 'Approving...' : '✓ Approve'}
                </button>
                <button
                  className="btn btn-reject"
                  onClick={() => handleRejectDonation(donation.id)}
                  disabled={approving[donation.id]}
                >
                  {approving[donation.id] ? 'Processing...' : '✕ Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}