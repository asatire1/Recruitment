import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  MapPin,
  FileText,
  ExternalLink,
  Edit2,
  Trash2,
  Clock,
  Send,
  MessageSquare,
  Briefcase,
  Calendar,
  User,
  ChevronDown,
  Plus,
  MoreHorizontal,
  AlertCircle
} from 'lucide-react';
import { Button, Card, CardBody, Badge, Textarea } from '../../components/ui';
import { CandidateFormModal, WhatsAppModal, ScheduleInterviewModal } from '../../components/common';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToCandidate,
  subscribeToNotes,
  subscribeToActivity,
  updateCandidate,
  deleteCandidate,
  addNote,
  deleteNote,
  logStatusChange,
  uploadCV,
  getFullName, 
  getInitials,
  getStatusConfig,
  getSourceLabel,
  CANDIDATE_STATUSES
} from '../../lib/candidates';
import {
  subscribeToCandidateInterviews,
  updateInterview,
  formatDateTime,
  formatTime,
  getInterviewStatusConfig,
  isInterviewPast,
  isInterviewToday,
  INTERVIEW_STATUSES
} from '../../lib/interviews';
import './CandidateDetail.css';

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleMobileMenu } = useOutletContext();
  const { user, userProfile } = useAuth();

  // State
  const [candidate, setCandidate] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('activity');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  // Note input
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Subscribe to candidate data
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const unsubCandidate = subscribeToCandidate(id, (data) => {
      if (data) {
        setCandidate(data);
        setLoading(false);
      } else {
        setError('Candidate not found');
        setLoading(false);
      }
    });

    const unsubNotes = subscribeToNotes(id, setNotes);
    const unsubActivity = subscribeToActivity(id, setActivity);
    const unsubInterviews = subscribeToCandidateInterviews(id, setInterviews);

    return () => {
      unsubCandidate();
      unsubNotes();
      unsubActivity();
      unsubInterviews();
    };
  }, [id]);

  // Close status menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowStatusMenu(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Format date/time
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (!candidate || candidate.status === newStatus) {
      setShowStatusMenu(false);
      return;
    }

    try {
      const oldStatus = candidate.status;
      await updateCandidate(id, { status: newStatus });
      await logStatusChange(id, oldStatus, newStatus, user.uid, userProfile?.displayName);
    } catch (err) {
      console.error('Error updating status:', err);
    }
    setShowStatusMenu(false);
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      await addNote(id, newNote.trim(), user.uid, userProfile?.displayName);
      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(id, noteId);
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // Handle interview status change
  const handleInterviewStatusChange = async (interviewId, newStatus) => {
    try {
      await updateInterview(interviewId, { status: newStatus }, user.uid, userProfile?.displayName);
    } catch (err) {
      console.error('Error updating interview status:', err);
    }
  };

  // Handle edit form submit
  const handleEditSubmit = async (formData, cvFile) => {
    setIsSubmitting(true);
    try {
      let cvData = {};
      if (cvFile) {
        cvData = await uploadCV(cvFile, id);
      }
      await updateCandidate(id, { ...formData, ...cvData });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating candidate:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await deleteCandidate(id);
      navigate('/candidates');
    } catch (err) {
      console.error('Error deleting candidate:', err);
    }
  };

  // Get activity icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'status_change': return Clock;
      case 'note_added': return MessageSquare;
      case 'cv_uploaded': return FileText;
      case 'interview_scheduled': return Calendar;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="candidate-detail-loading">
        <div className="loading-spinner" />
        <p>Loading candidate...</p>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="candidate-detail-error">
        <AlertCircle size={48} />
        <h2>Candidate Not Found</h2>
        <p>The candidate you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate('/candidates')}>
          Back to Candidates
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(candidate.status);

  return (
    <>
      <Header 
        title={getFullName(candidate)}
        subtitle={candidate.jobTitle || 'No position assigned'}
        onMenuClick={toggleMobileMenu}
        actions={
          <div className="candidate-detail-actions">
            <Button variant="outline" leftIcon={<Edit2 size={16} />} onClick={() => setIsEditModalOpen(true)}>
              Edit
            </Button>
            <Button variant="danger" leftIcon={<Trash2 size={16} />} onClick={() => setDeleteConfirm(true)}>
              Delete
            </Button>
          </div>
        }
      />

      <div className="page candidate-detail-page">
        {/* Back Link */}
        <Link to="/candidates" className="candidate-detail-back">
          <ArrowLeft size={16} />
          Back to Candidates
        </Link>

        <div className="candidate-detail-grid">
          {/* Left Column - Main Info */}
          <div className="candidate-detail-main">
            {/* Profile Card */}
            <Card className="candidate-profile-card">
              <CardBody>
                <div className="candidate-profile-header">
                  <div className="candidate-profile-avatar">
                    {getInitials(candidate)}
                  </div>
                  <div className="candidate-profile-info">
                    <h1 className="candidate-profile-name">{getFullName(candidate)}</h1>
                    <p className="candidate-profile-job">{candidate.jobTitle || 'No position assigned'}</p>
                    
                    {/* Status Dropdown */}
                    <div className="candidate-status-wrapper">
                      <button 
                        className="candidate-status-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowStatusMenu(!showStatusMenu);
                        }}
                      >
                        <Badge variant={statusConfig.color} dot>
                          {statusConfig.label}
                        </Badge>
                        <ChevronDown size={14} />
                      </button>
                      
                      {showStatusMenu && (
                        <div className="candidate-status-dropdown" onClick={(e) => e.stopPropagation()}>
                          {CANDIDATE_STATUSES.map(status => (
                            <button
                              key={status.value}
                              className={candidate.status === status.value ? 'active' : ''}
                              onClick={() => handleStatusChange(status.value)}
                            >
                              <span className={`status-dot status-dot-${status.color}`} />
                              {status.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="candidate-profile-contacts">
                  <a href={`mailto:${candidate.email}`} className="candidate-contact-item">
                    <Mail size={18} />
                    <span>{candidate.email}</span>
                  </a>
                  <a href={`tel:${candidate.phone}`} className="candidate-contact-item">
                    <Phone size={18} />
                    <span>{candidate.phone}</span>
                  </a>
                  {candidate.address && (
                    <div className="candidate-contact-item">
                      <MapPin size={18} />
                      <span>{candidate.address}{candidate.postcode ? `, ${candidate.postcode}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="candidate-quick-actions">
                  <button 
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="quick-action-btn quick-action-whatsapp"
                  >
                    <Send size={16} />
                    WhatsApp
                  </button>
                  <a 
                    href={`mailto:${candidate.email}`}
                    className="quick-action-btn quick-action-email"
                  >
                    <Mail size={16} />
                    Email
                  </a>
                  {candidate.cvUrl && (
                    <a 
                      href={candidate.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-action-btn quick-action-cv"
                    >
                      <FileText size={16} />
                      View CV
                    </a>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Tabs */}
            <div className="candidate-tabs">
              <button 
                className={`candidate-tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
              <button 
                className={`candidate-tab ${activeTab === 'interviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('interviews')}
              >
                Interviews ({interviews.length})
              </button>
              <button 
                className={`candidate-tab ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                Notes ({notes.length})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'activity' ? (
              <Card>
                <CardBody>
                  {activity.length === 0 ? (
                    <div className="candidate-empty-tab">
                      <Clock size={24} />
                      <p>No activity yet</p>
                    </div>
                  ) : (
                    <div className="candidate-activity-list">
                      {activity.map((item) => {
                        const Icon = getActivityIcon(item.type);
                        return (
                          <div key={item.id} className="candidate-activity-item">
                            <div className="activity-icon">
                              <Icon size={16} />
                            </div>
                            <div className="activity-content">
                              <p className="activity-description">{item.description}</p>
                              <p className="activity-meta">
                                {item.createdByName} · {formatRelativeTime(item.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
            ) : activeTab === 'interviews' ? (
              <Card>
                <CardBody>
                  {/* Schedule Button */}
                  <div className="candidate-interviews-header">
                    <Button 
                      size="sm" 
                      leftIcon={<Calendar size={14} />}
                      onClick={() => {
                        setEditingInterview(null);
                        setIsScheduleModalOpen(true);
                      }}
                    >
                      Schedule Interview
                    </Button>
                  </div>

                  {interviews.length === 0 ? (
                    <div className="candidate-empty-tab">
                      <Calendar size={24} />
                      <p>No interviews scheduled</p>
                    </div>
                  ) : (
                    <div className="candidate-interviews-list">
                      {interviews.map((interview) => {
                        const statusConfig = getInterviewStatusConfig(interview.status);
                        const isPast = isInterviewPast(interview.dateTime);
                        const isToday = isInterviewToday(interview.dateTime);
                        
                        return (
                          <div 
                            key={interview.id} 
                            className={`candidate-interview-card ${isPast && interview.status === 'scheduled' ? 'interview-overdue' : ''} ${isToday ? 'interview-today' : ''}`}
                          >
                            <div className="interview-card-header">
                              <div className="interview-type-badge">
                                {interview.type === 'trial' ? 'Trial Day' : 'Interview'}
                              </div>
                              <Badge variant={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                            
                            <div className="interview-card-datetime">
                              <Calendar size={16} />
                              <span>{formatDateTime(interview.dateTime)}</span>
                              {isToday && <span className="interview-today-badge">Today</span>}
                            </div>
                            
                            {interview.location && (
                              <div className="interview-card-location">
                                <MapPin size={16} />
                                <span>{interview.location}</span>
                              </div>
                            )}
                            
                            {interview.interviewerName && (
                              <div className="interview-card-interviewer">
                                <User size={16} />
                                <span>{interview.interviewerName}</span>
                              </div>
                            )}
                            
                            {interview.status === 'scheduled' && (
                              <div className="interview-card-actions">
                                <button
                                  className="interview-action-btn"
                                  onClick={() => {
                                    setEditingInterview(interview);
                                    setIsScheduleModalOpen(true);
                                  }}
                                >
                                  <Edit2 size={14} />
                                  Edit
                                </button>
                                <button
                                  className="interview-action-btn interview-action-complete"
                                  onClick={() => handleInterviewStatusChange(interview.id, 'completed')}
                                >
                                  <Clock size={14} />
                                  Complete
                                </button>
                                <button
                                  className="interview-action-btn interview-action-cancel"
                                  onClick={() => handleInterviewStatusChange(interview.id, 'cancelled')}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            
                            {interview.status === 'completed' && interview.feedback && (
                              <div className="interview-feedback">
                                <p className="interview-feedback-label">Feedback:</p>
                                <p className="interview-feedback-text">{interview.feedback}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody>
                  {/* Add Note Form */}
                  <div className="candidate-add-note">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <div className="candidate-add-note-actions">
                      <Button 
                        size="sm" 
                        onClick={handleAddNote}
                        loading={isAddingNote}
                        disabled={!newNote.trim()}
                      >
                        Add Note
                      </Button>
                    </div>
                  </div>

                  {notes.length === 0 ? (
                    <div className="candidate-empty-tab">
                      <MessageSquare size={24} />
                      <p>No notes yet</p>
                    </div>
                  ) : (
                    <div className="candidate-notes-list">
                      {notes.map((note) => (
                        <div key={note.id} className="candidate-note-item">
                          <div className="note-header">
                            <span className="note-author">{note.createdByName}</span>
                            <span className="note-date">{formatRelativeTime(note.createdAt)}</span>
                            <button 
                              className="note-delete"
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete note"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="note-content">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="candidate-detail-sidebar">
            {/* Details Card */}
            <Card>
              <CardBody>
                <h3 className="sidebar-section-title">Details</h3>
                
                <div className="sidebar-details">
                  <div className="sidebar-detail-item">
                    <span className="sidebar-detail-label">Source</span>
                    <span className="sidebar-detail-value">{getSourceLabel(candidate.source)}</span>
                  </div>
                  <div className="sidebar-detail-item">
                    <span className="sidebar-detail-label">Applied</span>
                    <span className="sidebar-detail-value">{formatDate(candidate.createdAt)}</span>
                  </div>
                  <div className="sidebar-detail-item">
                    <span className="sidebar-detail-label">Last Updated</span>
                    <span className="sidebar-detail-value">{formatDate(candidate.updatedAt)}</span>
                  </div>
                  {candidate.cvFileName && (
                    <div className="sidebar-detail-item">
                      <span className="sidebar-detail-label">CV</span>
                      <a 
                        href={candidate.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sidebar-detail-link"
                      >
                        {candidate.cvFileName}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Job Card */}
            {candidate.jobId && (
              <Card>
                <CardBody>
                  <h3 className="sidebar-section-title">Position</h3>
                  <div className="sidebar-job">
                    <Briefcase size={18} />
                    <div>
                      <p className="sidebar-job-title">{candidate.jobTitle}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Initial Notes */}
            {candidate.notes && (
              <Card>
                <CardBody>
                  <h3 className="sidebar-section-title">Initial Notes</h3>
                  <p className="sidebar-initial-notes">{candidate.notes}</p>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <CandidateFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        candidate={candidate}
        loading={isSubmitting}
      />

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        candidate={candidate}
      />

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingInterview(null);
        }}
        candidate={candidate}
        existingInterview={editingInterview}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="delete-modal-backdrop" onClick={() => setDeleteConfirm(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <Trash2 size={24} />
            </div>
            <h3>Delete Candidate</h3>
            <p>Are you sure you want to delete <strong>{getFullName(candidate)}</strong>? This will also delete their CV and all notes. This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
