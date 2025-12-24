import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  Clock,
  ArrowRight,
  Plus,
  UserPlus,
  ChevronRight
} from 'lucide-react';
import { Card, CardBody, Badge, Button } from '../../components/ui';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { 
  useDashboardStats, 
  useRecentCandidates, 
  useUpcomingInterviews,
  useTodaysInterviews 
} from '../../hooks/useDashboard';
import { getStatusConfig, getInitials } from '../../lib/candidates';
import { formatTime, isInterviewToday } from '../../lib/interviews';
import './Dashboard.css';

export default function Dashboard() {
  const { toggleMobileMenu } = useOutletContext();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Fetch real data
  const stats = useDashboardStats();
  const { candidates: recentCandidates, loading: candidatesLoading } = useRecentCandidates(5);
  const { interviews: upcomingInterviews, loading: interviewsLoading } = useUpcomingInterviews(5);
  const { interviews: todaysInterviews } = useTodaysInterviews();

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Format relative time
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
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Format interview date
  const formatInterviewDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  return (
    <>
      <Header 
        title={`${getGreeting()}, ${userProfile?.displayName?.split(' ')[0] || 'there'}!`}
        subtitle="Here's what's happening with your recruitment today"
        onMenuClick={toggleMobileMenu}
      />
      
      <div className="page">
        {/* Today's Schedule Alert */}
        {todaysInterviews.length > 0 && (
          <div className="dashboard-today-alert">
            <div className="today-alert-icon">
              <Calendar size={20} />
            </div>
            <div className="today-alert-content">
              <span className="today-alert-title">
                You have {todaysInterviews.length} interview{todaysInterviews.length !== 1 ? 's' : ''} today
              </span>
              <span className="today-alert-times">
                {todaysInterviews.map((interview, i) => (
                  <span key={interview.id}>
                    {formatTime(interview.dateTime)}
                    {i < todaysInterviews.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            </div>
            <Link to="/candidates" className="today-alert-link">
              View all <ChevronRight size={16} />
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="dashboard-stats">
          <Card className="dashboard-stat-card" onClick={() => navigate('/candidates')}>
            <CardBody>
              <div className="stat-icon stat-icon-primary">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">
                  {stats.loading ? '...' : stats.candidates.total}
                </span>
                <span className="stat-label">Total Candidates</span>
              </div>
              <div className="stat-breakdown">
                <span className="stat-breakdown-item stat-new">
                  {stats.candidates.new} new
                </span>
                <span className="stat-breakdown-item stat-progress">
                  {stats.candidates.inProgress} in progress
                </span>
              </div>
            </CardBody>
          </Card>

          <Card className="dashboard-stat-card" onClick={() => navigate('/jobs')}>
            <CardBody>
              <div className="stat-icon stat-icon-success">
                <Briefcase size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">
                  {stats.loading ? '...' : stats.jobs.active}
                </span>
                <span className="stat-label">Active Jobs</span>
              </div>
              <div className="stat-breakdown">
                <span className="stat-breakdown-item">
                  {stats.jobs.total} total listings
                </span>
              </div>
            </CardBody>
          </Card>

          <Card className="dashboard-stat-card">
            <CardBody>
              <div className="stat-icon stat-icon-warning">
                <Calendar size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">
                  {stats.loading ? '...' : stats.interviews.today}
                </span>
                <span className="stat-label">Interviews Today</span>
              </div>
              <div className="stat-breakdown">
                <span className="stat-breakdown-item">
                  {stats.interviews.upcoming} this week
                </span>
              </div>
            </CardBody>
          </Card>

          <Card className="dashboard-stat-card">
            <CardBody>
              <div className="stat-icon stat-icon-info">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">
                  {stats.loading ? '...' : stats.candidates.approved}
                </span>
                <span className="stat-label">Approved</span>
              </div>
              <div className="stat-breakdown">
                <span className="stat-breakdown-item stat-success">
                  Ready to hire
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-quick-actions">
          <Button 
            leftIcon={<UserPlus size={16} />}
            onClick={() => navigate('/candidates')}
          >
            Add Candidate
          </Button>
          <Button 
            variant="outline"
            leftIcon={<Plus size={16} />}
            onClick={() => navigate('/jobs')}
          >
            Post New Job
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Recent Candidates */}
          <Card className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">Recent Candidates</h3>
              <Link to="/candidates" className="dashboard-card-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <CardBody className="dashboard-card-body">
              {candidatesLoading ? (
                <div className="dashboard-loading">
                  <div className="dashboard-loading-spinner" />
                </div>
              ) : recentCandidates.length === 0 ? (
                <div className="dashboard-empty">
                  <Users size={32} />
                  <p>No candidates yet</p>
                  <Button size="sm" onClick={() => navigate('/candidates')}>
                    Add First Candidate
                  </Button>
                </div>
              ) : (
                <div className="dashboard-candidates-list">
                  {recentCandidates.map((candidate) => {
                    const statusConfig = getStatusConfig(candidate.status);
                    return (
                      <Link 
                        key={candidate.id} 
                        to={`/candidates/${candidate.id}`}
                        className="dashboard-candidate-item"
                      >
                        <div className="dashboard-candidate-avatar">
                          {getInitials(candidate)}
                        </div>
                        <div className="dashboard-candidate-info">
                          <span className="dashboard-candidate-name">
                            {candidate.firstName} {candidate.lastName}
                          </span>
                          <span className="dashboard-candidate-job">
                            {candidate.jobTitle || 'No position'}
                          </span>
                        </div>
                        <div className="dashboard-candidate-meta">
                          <Badge variant={statusConfig.color} size="sm">
                            {statusConfig.label}
                          </Badge>
                          <span className="dashboard-candidate-time">
                            {formatRelativeTime(candidate.createdAt)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Upcoming Interviews */}
          <Card className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">Upcoming Interviews</h3>
              <Link to="/candidates" className="dashboard-card-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <CardBody className="dashboard-card-body">
              {interviewsLoading ? (
                <div className="dashboard-loading">
                  <div className="dashboard-loading-spinner" />
                </div>
              ) : upcomingInterviews.length === 0 ? (
                <div className="dashboard-empty">
                  <Calendar size={32} />
                  <p>No upcoming interviews</p>
                  <span className="dashboard-empty-hint">
                    Schedule interviews from candidate profiles
                  </span>
                </div>
              ) : (
                <div className="dashboard-interviews-list">
                  {upcomingInterviews.map((interview) => {
                    const isToday = isInterviewToday(interview.dateTime);
                    return (
                      <Link 
                        key={interview.id}
                        to={`/candidates/${interview.candidateId}`}
                        className={`dashboard-interview-item ${isToday ? 'interview-today' : ''}`}
                      >
                        <div className="dashboard-interview-date">
                          <span className="interview-day">
                            {formatInterviewDate(interview.dateTime)}
                          </span>
                          <span className="interview-time">
                            {formatTime(interview.dateTime)}
                          </span>
                        </div>
                        <div className="dashboard-interview-info">
                          <span className="dashboard-interview-name">
                            {interview.candidateName}
                          </span>
                          <span className="dashboard-interview-type">
                            {interview.type === 'trial' ? 'Trial Day' : 'Interview'}
                            {interview.location && ` · ${interview.location}`}
                          </span>
                        </div>
                        {isToday && (
                          <Badge variant="success" size="sm">Today</Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
