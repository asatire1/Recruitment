import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Upload, 
  UserPlus,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Files
} from 'lucide-react';
import { Button, Card, CardBody, Badge, Input } from '../../components/ui';
import { CandidateFormModal, BulkCVUpload } from '../../components/common';
import Header from '../../components/layout/Header';
import { useCandidates, useCandidateStats } from '../../hooks/useCandidates';
import { useJobs } from '../../hooks/useJobs';
import { 
  CANDIDATE_STATUSES, 
  getStatusConfig, 
  getFullName, 
  getInitials,
  updateCandidate,
  deleteCandidate
} from '../../lib/candidates';
import './Candidates.css';

const ITEMS_PER_PAGE = 10;

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' }
];

export default function Candidates() {
  const { toggleMobileMenu } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Filters from URL params (for shareable links)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [jobFilter, setJobFilter] = useState(searchParams.get('job') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'date_desc');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  
  // Advanced filters panel
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Menu state
  const [activeMenu, setActiveMenu] = useState(null);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Bulk CV upload modal
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Hooks
  const { candidates, totalCount, filteredCount, loading, error, addCandidate, editCandidate } = useCandidates({
    status: statusFilter,
    search: searchQuery,
    jobId: jobFilter,
    dateFrom,
    dateTo,
    sortBy
  });
  const { stats, refetch: refetchStats } = useCandidateStats();
  const { jobs } = useJobs({ status: 'active' });

  // Calculate pagination
  const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCandidates = candidates.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, jobFilter, dateFrom, dateTo, sortBy]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (jobFilter !== 'all') params.set('job', jobFilter);
    if (sortBy !== 'date_desc') params.set('sort', sortBy);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    setSearchParams(params, { replace: true });
  }, [searchQuery, statusFilter, jobFilter, sortBy, dateFrom, dateTo, setSearchParams]);

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
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setJobFilter('all');
    setSortBy('date_desc');
    setDateFrom('');
    setDateTo('');
    setShowAdvancedFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || jobFilter !== 'all' || dateFrom || dateTo;

  // Handle create/edit form submit
  const handleFormSubmit = async (formData, cvFile) => {
    setIsSubmitting(true);
    try {
      if (editingCandidate) {
        await editCandidate(editingCandidate.id, formData, cvFile);
      } else {
        await addCandidate(formData, cvFile);
      }
      setIsFormOpen(false);
      setEditingCandidate(null);
      refetchStats();
    } catch (err) {
      console.error('Error saving candidate:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      await updateCandidate(candidateId, { status: newStatus });
      refetchStats();
    } catch (err) {
      console.error('Error updating status:', err);
    }
    setActiveMenu(null);
  };

  // Handle delete
  const handleDelete = async (candidateId) => {
    try {
      await deleteCandidate(candidateId);
      refetchStats();
    } catch (err) {
      console.error('Error deleting candidate:', err);
    }
    setDeleteConfirm(null);
    setActiveMenu(null);
  };

  // Open edit modal
  const handleEdit = (candidate) => {
    setEditingCandidate(candidate);
    setIsFormOpen(true);
    setActiveMenu(null);
  };

  return (
    <>
      <Header 
        title="Candidates" 
        subtitle={`${filteredCount} candidate${filteredCount !== 1 ? 's' : ''}${hasActiveFilters ? ' (filtered)' : ''}`}
        onMenuClick={toggleMobileMenu}
        actions={
          <div className="header-actions-group">
            <Button 
              variant="outline" 
              leftIcon={<Files size={16} />} 
              onClick={() => setIsBulkUploadOpen(true)}
            >
              Bulk Upload CVs
            </Button>
            <Button leftIcon={<Upload size={16} />} onClick={() => setIsFormOpen(true)}>
              Add Candidate
            </Button>
          </div>
        }
      />
      
      <div className="page">
        {/* Stats */}
        <div className="candidates-stats">
          <div 
            className={`candidates-stat ${statusFilter === 'all' ? 'candidates-stat-active' : ''}`}
            onClick={() => setStatusFilter('all')}
            role="button"
            tabIndex={0}
          >
            <span className="candidates-stat-value">{stats.total}</span>
            <span className="candidates-stat-label">Total</span>
          </div>
          <div 
            className={`candidates-stat ${statusFilter === 'new' ? 'candidates-stat-active' : ''}`}
            onClick={() => setStatusFilter('new')}
            role="button"
            tabIndex={0}
          >
            <span className="candidates-stat-value candidates-stat-new">{stats.new}</span>
            <span className="candidates-stat-label">New</span>
          </div>
          <div 
            className={`candidates-stat`}
            onClick={() => setStatusFilter('all')}
            role="button"
            tabIndex={0}
          >
            <span className="candidates-stat-value candidates-stat-progress">{stats.in_progress}</span>
            <span className="candidates-stat-label">In Progress</span>
          </div>
          <div 
            className={`candidates-stat ${statusFilter === 'approved' ? 'candidates-stat-active' : ''}`}
            onClick={() => setStatusFilter('approved')}
            role="button"
            tabIndex={0}
          >
            <span className="candidates-stat-value candidates-stat-approved">{stats.approved}</span>
            <span className="candidates-stat-label">Approved</span>
          </div>
        </div>

        {/* Filters Bar */}
        <Card className="candidates-filters">
          <CardBody>
            <div className="candidates-filters-row">
              <div className="candidates-search">
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search size={18} />}
                  rightIcon={searchQuery ? (
                    <button 
                      className="candidates-search-clear"
                      onClick={() => setSearchQuery('')}
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                />
              </div>
              
              <div className="candidates-filter-group">
                <div className="candidates-select-wrapper">
                  <select 
                    className="candidates-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    {CANDIDATE_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="candidates-select-icon" />
                </div>

                <div className="candidates-select-wrapper">
                  <select 
                    className="candidates-select"
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                  >
                    <option value="all">All Jobs</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="candidates-select-icon" />
                </div>

                <Button 
                  variant={showAdvancedFilters ? 'secondary' : 'outline'} 
                  leftIcon={<SlidersHorizontal size={16} />}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  Filters
                </Button>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="candidates-advanced-filters">
                <div className="candidates-advanced-filters-row">
                  <div className="candidates-filter-field">
                    <label>From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="candidates-date-input"
                    />
                  </div>
                  <div className="candidates-filter-field">
                    <label>To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="candidates-date-input"
                    />
                  </div>
                  <div className="candidates-filter-field">
                    <label>Sort By</label>
                    <div className="candidates-select-wrapper">
                      <select 
                        className="candidates-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        {SORT_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="candidates-select-icon" />
                    </div>
                  </div>
                </div>
                
                {hasActiveFilters && (
                  <div className="candidates-filter-actions">
                    <button 
                      className="candidates-clear-filters"
                      onClick={clearAllFilters}
                    >
                      <X size={14} />
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Active Filter Tags */}
        {hasActiveFilters && !showAdvancedFilters && (
          <div className="candidates-filter-tags">
            {searchQuery && (
              <span className="candidates-filter-tag">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')}><X size={14} /></button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="candidates-filter-tag">
                Status: {CANDIDATE_STATUSES.find(s => s.value === statusFilter)?.label}
                <button onClick={() => setStatusFilter('all')}><X size={14} /></button>
              </span>
            )}
            {jobFilter !== 'all' && (
              <span className="candidates-filter-tag">
                Job: {jobs.find(j => j.id === jobFilter)?.title}
                <button onClick={() => setJobFilter('all')}><X size={14} /></button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="candidates-filter-tag">
                Date: {dateFrom || '...'} to {dateTo || '...'}
                <button onClick={() => { setDateFrom(''); setDateTo(''); }}><X size={14} /></button>
              </span>
            )}
            <button className="candidates-clear-all" onClick={clearAllFilters}>
              Clear all
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="candidates-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="candidates-loading">
            <div className="candidates-loading-spinner" />
            <p>Loading candidates...</p>
          </div>
        ) : paginatedCandidates.length === 0 ? (
          /* Empty State */
          <Card className="candidates-empty-card">
            <CardBody>
              <div className="empty-state">
                <div className="empty-state-icon">
                  <UserPlus size={28} />
                </div>
                <h3 className="empty-state-title">
                  {hasActiveFilters
                    ? 'No candidates match your filters'
                    : 'No candidates yet'
                  }
                </h3>
                <p className="empty-state-description">
                  {hasActiveFilters
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by uploading a CV or manually adding a candidate.'
                  }
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <div className="empty-state-actions">
                    <Button leftIcon={<Upload size={16} />} onClick={() => setIsFormOpen(true)}>
                      Add Candidate
                    </Button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        ) : (
          /* Candidates Table */
          <>
            <Card>
              <div className="candidates-table-wrapper">
                <table className="candidates-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th>CV</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCandidates.map((candidate) => {
                      const statusConfig = getStatusConfig(candidate.status);
                      return (
                        <tr 
                          key={candidate.id} 
                          onClick={() => navigate(`/candidates/${candidate.id}`)}
                          className="candidate-row-clickable"
                        >
                          <td>
                            <div className="candidate-info">
                              <div className="candidate-avatar">
                                {getInitials(candidate)}
                              </div>
                              <div className="candidate-details">
                                <div className="candidate-name">{getFullName(candidate)}</div>
                                <div className="candidate-contact">
                                  <span className="candidate-email">
                                    <Mail size={12} />
                                    {candidate.email}
                                  </span>
                                  <span className="candidate-phone">
                                    <Phone size={12} />
                                    {candidate.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="candidate-job">
                              {candidate.jobTitle || 'Not assigned'}
                            </span>
                          </td>
                          <td>
                            <Badge variant={statusConfig.color} dot>
                              {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="candidate-date">
                            {formatDate(candidate.createdAt)}
                          </td>
                          <td>
                            {candidate.cvUrl ? (
                              <a 
                                href={candidate.cvUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="candidate-cv-link"
                                title="View CV"
                              >
                                <FileText size={16} />
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="candidate-no-cv">No CV</span>
                            )}
                          </td>
                          <td>
                            <div className="candidate-actions-wrapper">
                              <button 
                                className="candidate-actions-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(activeMenu === candidate.id ? null : candidate.id);
                                }}
                              >
                                <MoreHorizontal size={18} />
                              </button>
                              
                              {activeMenu === candidate.id && (
                                <div className="candidate-dropdown" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => handleEdit(candidate)}>
                                    <Edit2 size={16} />
                                    Edit
                                  </button>
                                  
                                  <div className="candidate-dropdown-divider" />
                                  <div className="candidate-dropdown-label">Change Status</div>
                                  
                                  {CANDIDATE_STATUSES.slice(0, 6).map(status => (
                                    <button 
                                      key={status.value}
                                      onClick={() => handleStatusChange(candidate.id, status.value)}
                                      className={candidate.status === status.value ? 'active' : ''}
                                    >
                                      {status.label}
                                    </button>
                                  ))}
                                  
                                  <div className="candidate-dropdown-divider" />
                                  
                                  <button 
                                    className="candidate-dropdown-danger"
                                    onClick={() => setDeleteConfirm(candidate)}
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="candidates-pagination">
                <div className="candidates-pagination-info">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredCount)} of {filteredCount}
                </div>
                <div className="candidates-pagination-controls">
                  <button
                    className="candidates-pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`candidates-pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    className="candidates-pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CandidateFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCandidate(null);
        }}
        onSubmit={handleFormSubmit}
        candidate={editingCandidate}
        loading={isSubmitting}
      />

      {/* Bulk CV Upload Modal */}
      <BulkCVUpload
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={(count) => {
          refetchStats();
          setIsBulkUploadOpen(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="delete-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <Trash2 size={24} />
            </div>
            <h3>Delete Candidate</h3>
            <p>Are you sure you want to delete <strong>{getFullName(deleteConfirm)}</strong>? This will also delete their CV. This action cannot be undone.</p>
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
