import React, { useState } from 'react';
import { 
  formatExperienceDuration, 
  calculateTotalExperience,
  SKILL_CATEGORIES 
} from '../hooks/useCVParser';
import './CVParseResults.css';

// Icons
const Icons = {
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  GraduationCap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
    </svg>
  ),
  Award: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="7"/>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  ChevronUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
};

// Skill category colors
const CATEGORY_COLORS = {
  clinical: '#3b82f6',
  technical: '#8b5cf6',
  soft: '#10b981',
  language: '#f59e0b',
  certification: '#ef4444'
};

// Section Component
function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`parse-section ${isOpen ? 'open' : ''}`}>
      <button 
        className="section-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="section-header-left">
          <div className="section-icon">
            <Icon />
          </div>
          <span className="section-title">{title}</span>
        </div>
        {isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
      </button>
      {isOpen && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  );
}

// Personal Info Display
function PersonalInfo({ data }) {
  if (!data) return null;

  return (
    <div className="personal-info-grid">
      {data.name && (
        <div className="info-item">
          <Icons.User />
          <span>{data.name}</span>
        </div>
      )}
      {data.email && (
        <div className="info-item">
          <Icons.Mail />
          <a href={`mailto:${data.email}`}>{data.email}</a>
        </div>
      )}
      {data.phone && (
        <div className="info-item">
          <Icons.Phone />
          <a href={`tel:${data.phone}`}>{data.phone}</a>
        </div>
      )}
      {data.location && (
        <div className="info-item">
          <Icons.MapPin />
          <span>{data.location}</span>
        </div>
      )}
    </div>
  );
}

// Experience Item
function ExperienceItem({ experience }) {
  const duration = experience.durationMonths 
    ? formatExperienceDuration(experience.durationMonths)
    : '';

  return (
    <div className="experience-item">
      <div className="experience-header">
        <h4 className="experience-title">{experience.title}</h4>
        {duration && <span className="experience-duration">{duration}</span>}
      </div>
      <div className="experience-company">{experience.company}</div>
      {experience.dates && (
        <div className="experience-dates">{experience.dates}</div>
      )}
      {experience.description && (
        <p className="experience-description">{experience.description}</p>
      )}
      {experience.highlights && experience.highlights.length > 0 && (
        <ul className="experience-highlights">
          {experience.highlights.map((highlight, idx) => (
            <li key={idx}>{highlight}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Education Item
function EducationItem({ education }) {
  return (
    <div className="education-item">
      <div className="education-header">
        <h4 className="education-degree">{education.degree}</h4>
        {education.year && <span className="education-year">{education.year}</span>}
      </div>
      <div className="education-institution">{education.institution}</div>
      {education.details && (
        <p className="education-details">{education.details}</p>
      )}
    </div>
  );
}

// Skills Display
function SkillsDisplay({ skills = [] }) {
  const categorizedSkills = skills.reduce((acc, skill) => {
    const category = typeof skill === 'string' ? 'other' : skill.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(typeof skill === 'string' ? skill : skill.name);
    return acc;
  }, {});

  return (
    <div className="skills-display">
      {Object.entries(categorizedSkills).map(([category, categorySkills]) => (
        <div key={category} className="skill-category">
          <h5 
            className="category-name"
            style={{ '--category-color': CATEGORY_COLORS[category] || '#6b7280' }}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </h5>
          <div className="category-skills">
            {categorySkills.map((skill, idx) => (
              <span 
                key={idx} 
                className="skill-badge"
                style={{ '--skill-color': CATEGORY_COLORS[category] || '#6b7280' }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Qualifications Display
function QualificationsDisplay({ qualifications = [] }) {
  return (
    <div className="qualifications-list">
      {qualifications.map((qual, idx) => (
        <div key={idx} className="qualification-item">
          <Icons.CheckCircle />
          <span>{typeof qual === 'string' ? qual : qual.name}</span>
          {qual.issueDate && (
            <span className="qual-date">{qual.issueDate}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Main CVParseResults Component
export default function CVParseResults({ 
  parsedData, 
  onEdit,
  showEditButton = true 
}) {
  if (!parsedData) {
    return (
      <div className="cv-parse-results empty">
        <p>No parsed CV data available</p>
      </div>
    );
  }

  const totalExperience = calculateTotalExperience(parsedData.experience);

  return (
    <div className="cv-parse-results">
      {/* Header */}
      <div className="results-header">
        <div className="results-header-left">
          <h3>Parsed CV Data</h3>
          <span className="ai-badge">
            <span>✨</span> AI Extracted
          </span>
        </div>
        {showEditButton && onEdit && (
          <button className="edit-btn" onClick={onEdit}>
            <Icons.Edit />
            Edit
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="results-summary">
        <div className="summary-stat">
          <span className="stat-value">
            {formatExperienceDuration(totalExperience)}
          </span>
          <span className="stat-label">Total Experience</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{parsedData.skills?.length || 0}</span>
          <span className="stat-label">Skills</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{parsedData.education?.length || 0}</span>
          <span className="stat-label">Qualifications</span>
        </div>
      </div>

      {/* Personal Information */}
      {parsedData.personalInfo && (
        <Section title="Personal Information" icon={Icons.User}>
          <PersonalInfo data={parsedData.personalInfo} />
        </Section>
      )}

      {/* Professional Summary */}
      {parsedData.summary && (
        <Section title="Professional Summary" icon={Icons.Briefcase}>
          <p className="summary-text">{parsedData.summary}</p>
        </Section>
      )}

      {/* Skills */}
      {parsedData.skills && parsedData.skills.length > 0 && (
        <Section title="Skills" icon={Icons.Award}>
          <SkillsDisplay skills={parsedData.skills} />
        </Section>
      )}

      {/* Experience */}
      {parsedData.experience && parsedData.experience.length > 0 && (
        <Section title="Work Experience" icon={Icons.Briefcase}>
          <div className="experience-list">
            {parsedData.experience.map((exp, idx) => (
              <ExperienceItem key={idx} experience={exp} />
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {parsedData.education && parsedData.education.length > 0 && (
        <Section title="Education" icon={Icons.GraduationCap}>
          <div className="education-list">
            {parsedData.education.map((edu, idx) => (
              <EducationItem key={idx} education={edu} />
            ))}
          </div>
        </Section>
      )}

      {/* Qualifications & Certifications */}
      {parsedData.qualifications && parsedData.qualifications.length > 0 && (
        <Section title="Qualifications & Certifications" icon={Icons.CheckCircle}>
          <QualificationsDisplay qualifications={parsedData.qualifications} />
        </Section>
      )}

      {/* Confidence Score */}
      {parsedData.confidence !== undefined && (
        <div className="confidence-indicator">
          <span className="confidence-label">AI Confidence:</span>
          <div className="confidence-bar">
            <div 
              className="confidence-fill"
              style={{ width: `${parsedData.confidence * 100}%` }}
            />
          </div>
          <span className="confidence-value">
            {Math.round(parsedData.confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
