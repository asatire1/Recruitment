import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  FileText, 
  ExternalLink, 
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { Badge } from '../ui';
import { getStatusConfig, getFullName, getInitials } from '../../lib/candidates';
import './CandidateCard.css';

/**
 * Mobile-friendly candidate card component
 * Used in place of table rows on mobile devices
 */
export default function CandidateCard({ 
  candidate, 
  onEdit, 
  onDelete, 
  onStatusChange,
  statuses = []
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = getStatusConfig(candidate.status);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleCardClick = () => {
    navigate(`/candidates/${candidate.id}`);
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action, e) => {
    e.stopPropagation();
    setShowMenu(false);
    action();
  };

  return (
    <div className="candidate-card" onClick={handleCardClick}>
      {/* Card Header */}
      <div className="candidate-card-header">
        <div className="candidate-card-avatar">
          {getInitials(candidate)}
        </div>
        <div className="candidate-card-identity">
          <h3 className="candidate-card-name">{getFullName(candidate)}</h3>
          <Badge variant={statusConfig.color} size="sm" dot>
            {statusConfig.label}
          </Badge>
        </div>
        <button 
          className="candidate-card-menu-btn"
          onClick={handleMenuClick}
          aria-label="More options"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Contact Info */}
      <div className="candidate-card-contact">
        {candidate.email && (
          <a 
            href={`mailto:${candidate.email}`} 
            className="candidate-card-contact-item"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail size={14} />
            <span>{candidate.email}</span>
          </a>
        )}
        {candidate.phone && (
          <a 
            href={`tel:${candidate.phone}`} 
            className="candidate-card-contact-item"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone size={14} />
            <span>{candidate.phone}</span>
          </a>
        )}
      </div>

      {/* Meta Info */}
      <div className="candidate-card-meta">
        <div className="candidate-card-meta-item">
          <Briefcase size={14} />
          <span>{candidate.jobTitle || 'No position'}</span>
        </div>
        <div className="candidate-card-meta-item">
          <Calendar size={14} />
          <span>{formatDate(candidate.createdAt)}</span>
        </div>
        {candidate.cvUrl && (
          <a 
            href={candidate.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="candidate-card-meta-item candidate-card-cv"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText size={14} />
            <span>View CV</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* View Arrow */}
      <div className="candidate-card-arrow">
        <ChevronRight size={20} />
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div 
            className="candidate-card-menu-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}
          />
          <div className="candidate-card-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => handleAction(() => onEdit(candidate), e)}>
              <Edit2 size={16} />
              Edit Candidate
            </button>
            
            <div className="candidate-card-menu-divider" />
            <div className="candidate-card-menu-label">Change Status</div>
            
            {statuses.slice(0, 6).map(status => (
              <button 
                key={status.value}
                onClick={(e) => handleAction(() => onStatusChange(candidate.id, status.value), e)}
                className={candidate.status === status.value ? 'active' : ''}
              >
                {status.label}
              </button>
            ))}
            
            <div className="candidate-card-menu-divider" />
            
            <button 
              className="candidate-card-menu-danger"
              onClick={(e) => handleAction(() => onDelete(candidate), e)}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
