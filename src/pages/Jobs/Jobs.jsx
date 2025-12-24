import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  MapPin, 
  Users,
  MoreHorizontal,
  Briefcase,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Pause,
  Play,
  X,
  AlertCircle
} from 'lucide-react';
import { Button, Card, CardBody, Badge, Input } from '../../components/ui';
import { JobFormModal } from '../../components/common';
import Header from '../../components/layout/Header';
import { useJobs, useJobStats } from '../../hooks/useJobs';
import { 
  JOB_CATEGORIES, 
  getCategoryLabel, 
  getStatusConfig,
  updateJob,
  deleteJob 
} from '../../lib/jobs';
import './Jobs.css';

export default function Jobs() {
  const { toggleMobileMenu } = useOutletContext();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Menu state
  const [activeMenu, setActiveMenu] = useState(null);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Hooks
  const { jobs, loading, error, addJob, editJob } = useJobs({
    status: statusFilter,
    category: categoryFilter,
    search: searchQuery
  });
  const { stats, refetch: refetchStats } = useJobStats();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Handle create/edit form submit
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingJob) {
        await editJob(editingJob.id, formData);
      } else {
        await addJob(formData);
      }
      setIsFormOpen(false);
      setEditingJob(null);
      refetchStats();
    } catch (err) {
      console.error('Error saving job:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (job) => {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    try {
      await updateJob(job.id, { status: newStatus });
      refetchStats();
    } catch (err) {
      console.error('Error updating status:', err);
    }
    setActiveMenu(null);
  };

  // Handle delete
  const handleDelete = async (jobId) => {
    try {
      await deleteJob(jobId);
      refetchStats();
    } catch (err) {
      console.error('Error deleting job:', err);
    }
    setDeleteConfirm(null);
    setActiveMenu(null);
  };

  // Open edit modal
  const handleEdit = (job) => {
    setEditingJob(job);
    setIsFormOpen(true);
    setActiveMenu(null);
  };

  return (
    <>
      <Header 
        title="Job Listings" 
        subtitle="Manage open positions across your branches"
        onMenuClick={toggleMobileMenu}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={() => setIsFormOpen(true)}>
            New Job Listing
          </Button>
        }
      />
      
      <div className="page">
        {/* Stats Summary */}
        <div className="jobs-stats">
          <Card className="jobs-stat-card">
            <CardBody>
              <div className="jobs-stat-icon jobs-stat-icon-active">
                <Play size={18} />
              </div>
              <div className="jobs-stat-value">{stats.active}</div>
              <div className="jobs-stat-label">Active</div>
            </CardBody>
          </Card>
          <Card className="jobs-stat-card">
            <CardBody>
              <div className="jobs-stat-icon jobs-stat-icon-paused">
                <Pause size={18} />
              </div>
              <div className="jobs-stat-value">{stats.paused}</div>
              <div className="jobs-stat-label">Paused</div>
            </CardBody>
          </Card>
          <Card className="jobs-stat-card">
            <CardBody>
              <div className="jobs-stat-icon jobs-stat-icon-closed">
                <Clock size={18} />
              </div>
              <div className="jobs-stat-value">{stats.closed}</div>
              <div className="jobs-stat-label">Closed</div>
            </CardBody>
          </Card>
          <Card className="jobs-stat-card">
            <CardBody>
              <div className="jobs-stat-icon jobs-stat-icon-total">
                <Briefcase size={18} />
              </div>
              <div className="jobs-stat-value">{stats.total}</div>
              <div className="jobs-stat-label">Total</div>
            </CardBody>
          </Card>
        </div>

        {/* Filters */}
        <Card className="jobs-filters">
          <CardBody>
            <div className="jobs-filters-row">
              <div className="jobs-search">
                <Input
                  placeholder="Search job listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search size={18} />}
                />
              </div>
              
              <div className="jobs-filter-group">
                <select 
                  className="jobs-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {JOB_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                
                <select 
                  className="jobs-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Error State */}
        {error && (
          <div className="jobs-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="jobs-loading">
            <div className="jobs-loading-spinner" />
            <p>Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          /* Empty State */
          <Card className="jobs-empty-card">
            <CardBody>
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Briefcase size={28} />
                </div>
                <h3 className="empty-state-title">
                  {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'No jobs match your filters'
                    : 'No job listings yet'
                  }
                </h3>
                <p className="empty-state-description">
                  {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Create your first job listing to start receiving candidate applications.'
                  }
                </p>
                {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
                  <Button leftIcon={<Plus size={16} />} onClick={() => setIsFormOpen(true)}>
                    Create Job Listing
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ) : (
          /* Jobs Grid */
          <div className="jobs-grid">
            {jobs.map((job) => {
              const statusConfig = getStatusConfig(job.status);
              return (
                <Card key={job.id} className="job-card">
                  <CardBody>
                    <div className="job-card-header">
                      <Badge variant={statusConfig.color} dot>
                        {statusConfig.label}
                      </Badge>
                      <div className="job-card-menu-wrapper">
                        <button 
                          className="job-card-menu"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === job.id ? null : job.id);
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        
                        {activeMenu === job.id && (
                          <div className="job-card-dropdown" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleEdit(job)}>
                              <Edit2 size={16} />
                              Edit
                            </button>
                            <button onClick={() => handleStatusToggle(job)}>
                              {job.status === 'active' ? (
                                <>
                                  <Pause size={16} />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play size={16} />
                                  Activate
                                </>
                              )}
                            </button>
                            <button 
                              className="job-card-dropdown-danger"
                              onClick={() => setDeleteConfirm(job)}
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="job-card-title">{job.title}</h3>
                    <p className="job-card-category">{getCategoryLabel(job.category)}</p>
                    
                    <div className="job-card-meta">
                      <div className="job-card-meta-item">
                        <MapPin size={14} />
                        <span>{job.location}</span>
                      </div>
                      {job.salary && (
                        <div className="job-card-meta-item">
                          <span className="job-card-salary">{job.salary}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="job-card-footer">
                      <span className="job-card-date">Posted {formatDate(job.createdAt)}</span>
                      <div className="job-card-actions">
                        <button 
                          className="job-card-action" 
                          title="Edit"
                          onClick={() => handleEdit(job)}
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <JobFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingJob(null);
        }}
        onSubmit={handleFormSubmit}
        job={editingJob}
        loading={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="delete-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <Trash2 size={24} />
            </div>
            <h3>Delete Job Listing</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.title}</strong>? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
