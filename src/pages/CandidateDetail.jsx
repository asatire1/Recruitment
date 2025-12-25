import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCandidate, useCandidates } from '../hooks/useCandidates';
import { CVUploader, CVParseResults, ConfirmModal } from '../components';
import './CandidateDetail.css';

// Icons
const Icons = {
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Phone: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Mail: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  MessageSquare: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
};

const STATUS_OPTIONS = ['new', 'screening', 'interview', 'trial', 'offer', 'approved', 'rejected', 'hired'];
const STATUS_COLORS = {
  new: '#3b82f6', screening: '#8b5cf6', interview: '#f59e0b', trial: '#10b981',
  offer: '#ec4899', approved: '#22c55e', rejected: '#ef4444', hired: '#06b6d4'
};

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { candidate, loading, error } = useCandidate(id);
  const { updateCandidate, deleteCandidate } = useCandidates();
  
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStatusChange = async (newStatus) => {
    await updateCandidate(id, { status: newStatus });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteCandidate(id);
    navigate('/candidates');
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /><p>Loading...</p></div>;
  }

  if (error || !candidate) {
    return (
      <div className="error-page">
        <h2>Candidate not found</h2>
        <Link to="/candidates">Back to Candidates</Link>
      </div>
    );
  }

  const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();

  return (
    <div className="candidate-detail">
      {/* Header */}
      <header className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <Icons.ArrowLeft />
        </button>
        <div className="header-info">
          <h1>{fullName}</h1>
          <p>{candidate.appliedJobTitle || 'No job specified'}</p>
        </div>
        <select
          value={candidate.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="status-select"
          style={{ '--status-color': STATUS_COLORS[candidate.status] }}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </header>

      {/* Contact Info */}
      <section className="info-section">
        <h2>Contact Information</h2>
        <div className="info-grid">
          {candidate.email && (
            <a href={`mailto:${candidate.email}`} className="info-item">
              <Icons.Mail />
              <span>{candidate.email}</span>
            </a>
          )}
          {candidate.phone && (
            <a href={`tel:${candidate.phone}`} className="info-item">
              <Icons.Phone />
              <span>{candidate.phone}</span>
            </a>
          )}
          {candidate.location && (
            <div className="info-item">
              <Icons.MapPin />
              <span>{candidate.location}</span>
            </div>
          )}
        </div>
      </section>

      {/* CV Section */}
      <section className="info-section">
        <h2>CV / Resume</h2>
        {candidate.cvParsed ? (
          <CVParseResults parsedData={candidate.parsedCV} />
        ) : (
          <CVUploader 
            candidateId={id}
            onParseComplete={(data) => updateCandidate(id, { cvParsed: true, parsedCV: data })}
          />
        )}
      </section>

      {/* Quick Actions */}
      <section className="actions-section">
        <a href={`https://wa.me/${candidate.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="action-btn whatsapp">
          <Icons.MessageSquare />
          WhatsApp
        </a>
        <a href={`mailto:${candidate.email}`} className="action-btn email">
          <Icons.Mail />
          Email
        </a>
        <button className="action-btn delete" onClick={() => setShowDelete(true)}>
          Delete
        </button>
      </section>

      {/* Delete Confirmation */}
      {showDelete && (
        <ConfirmModal
          title="Delete Candidate"
          message={`Are you sure you want to delete ${fullName}? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={isDeleting}
        />
      )}
    </div>
  );
}
