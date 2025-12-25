import React, { useState } from 'react';
import { FILTER_OPTIONS } from '../hooks/useAlgoliaSearch';
import { PHARMACY_SKILLS } from '../hooks/useCVParser';
import './SearchFilters.css';

// Icons
const Icons = {
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  ChevronUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
};

// Collapsible Filter Section
function FilterSection({ title, children, defaultOpen = true, count = 0 }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`filter-section ${isOpen ? 'open' : ''}`}>
      <button 
        className="filter-section-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="filter-section-title">
          {title}
          {count > 0 && <span className="filter-section-count">{count}</span>}
        </span>
        {isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
      </button>
      {isOpen && (
        <div className="filter-section-content">
          {children}
        </div>
      )}
    </div>
  );
}

// Checkbox Filter Option
function FilterCheckbox({ label, checked, onChange, count }) {
  return (
    <label className={`filter-checkbox ${checked ? 'checked' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span className="checkbox-indicator">
        {checked && <Icons.Check />}
      </span>
      <span className="checkbox-label">{label}</span>
      {count !== undefined && (
        <span className="checkbox-count">{count}</span>
      )}
    </label>
  );
}

// Skills Filter with Categories
function SkillsFilter({ selectedSkills = [], onToggle }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Flatten all skills
  const allSkills = Object.entries(PHARMACY_SKILLS).flatMap(([category, skills]) =>
    skills.map(skill => ({ name: skill, category }))
  );

  // Filter by search
  const filteredSkills = searchQuery
    ? allSkills.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSkills;

  // Limit display
  const displaySkills = showAll ? filteredSkills : filteredSkills.slice(0, 10);

  return (
    <div className="skills-filter">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search skills..."
        className="skills-search"
      />
      
      {selectedSkills.length > 0 && (
        <div className="selected-skills">
          {selectedSkills.map(skill => (
            <span key={skill} className="selected-skill">
              {skill}
              <button onClick={() => onToggle(skill)}>
                <Icons.X />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="skills-list">
        {displaySkills.map(skill => (
          <FilterCheckbox
            key={skill.name}
            label={skill.name}
            checked={selectedSkills.includes(skill.name)}
            onChange={() => onToggle(skill.name)}
          />
        ))}
      </div>

      {filteredSkills.length > 10 && (
        <button 
          className="show-more-btn"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show ${filteredSkills.length - 10} more`}
        </button>
      )}
    </div>
  );
}

// Main SearchFilters Component
export default function SearchFilters({
  filters = {},
  facets = {},
  onUpdateFilters,
  onToggleFilter,
  onClearFilters
}) {
  // Count active filters
  const countActive = (key) => {
    const value = filters[key];
    if (Array.isArray(value)) return value.length;
    if (value !== undefined && value !== null && value !== '') return 1;
    return 0;
  };

  // Get facet count
  const getFacetCount = (facetName, value) => {
    return facets[facetName]?.[value] || 0;
  };

  // Check if filter value is selected
  const isSelected = (key, value) => {
    const filterValue = filters[key];
    if (Array.isArray(filterValue)) return filterValue.includes(value);
    return filterValue === value;
  };

  // Handle experience range selection
  const handleExperienceChange = (range) => {
    if (isSelected('experienceRange', range.value)) {
      onUpdateFilters({
        experienceRange: null,
        experienceMin: undefined,
        experienceMax: undefined
      });
    } else {
      onUpdateFilters({
        experienceRange: range.value,
        experienceMin: range.min,
        experienceMax: range.max
      });
    }
  };

  // Total active filters
  const totalActive = Object.keys(filters).reduce((sum, key) => sum + countActive(key), 0);

  return (
    <aside className="search-filters">
      <div className="filters-header">
        <h2>Filters</h2>
        {totalActive > 0 && (
          <button className="clear-all-btn" onClick={onClearFilters}>
            Clear all ({totalActive})
          </button>
        )}
      </div>

      <div className="filters-body">
        {/* Status Filter */}
        <FilterSection 
          title="Status" 
          count={countActive('status')}
        >
          {FILTER_OPTIONS.status.map(option => (
            <FilterCheckbox
              key={option.value}
              label={option.label}
              checked={isSelected('status', option.value)}
              onChange={() => onToggleFilter('status', option.value)}
              count={getFacetCount('status', option.value)}
            />
          ))}
        </FilterSection>

        {/* Job Type Filter */}
        <FilterSection 
          title="Job Type" 
          count={countActive('jobType')}
        >
          {FILTER_OPTIONS.jobType.map(option => (
            <FilterCheckbox
              key={option.value}
              label={option.label}
              checked={isSelected('jobType', option.value)}
              onChange={() => onToggleFilter('jobType', option.value)}
              count={getFacetCount('appliedJobType', option.value)}
            />
          ))}
        </FilterSection>

        {/* Experience Filter */}
        <FilterSection 
          title="Experience" 
          count={filters.experienceRange ? 1 : 0}
        >
          {FILTER_OPTIONS.experience.map(option => (
            <FilterCheckbox
              key={option.value}
              label={option.label}
              checked={filters.experienceRange === option.value}
              onChange={() => handleExperienceChange(option)}
            />
          ))}
        </FilterSection>

        {/* Skills Filter */}
        <FilterSection 
          title="Skills" 
          count={countActive('skills')}
          defaultOpen={false}
        >
          <SkillsFilter
            selectedSkills={filters.skills || []}
            onToggle={(skill) => onToggleFilter('skills', skill)}
          />
        </FilterSection>

        {/* Availability Filter */}
        <FilterSection 
          title="Availability" 
          count={filters.availability ? 1 : 0}
          defaultOpen={false}
        >
          {FILTER_OPTIONS.availability.map(option => (
            <FilterCheckbox
              key={option.value}
              label={option.label}
              checked={filters.availability === option.value}
              onChange={() => onUpdateFilters({
                availability: filters.availability === option.value ? null : option.value
              })}
            />
          ))}
        </FilterSection>

        {/* Additional Filters */}
        <FilterSection 
          title="Other" 
          defaultOpen={false}
          count={(filters.hasCv ? 1 : 0) + (filters.gphcRegistered ? 1 : 0)}
        >
          <FilterCheckbox
            label="Has CV uploaded"
            checked={filters.hasCv === true}
            onChange={() => onUpdateFilters({
              hasCv: filters.hasCv === true ? undefined : true
            })}
          />
          <FilterCheckbox
            label="GPhC Registered"
            checked={filters.gphcRegistered === true}
            onChange={() => onUpdateFilters({
              gphcRegistered: filters.gphcRegistered === true ? undefined : true
            })}
          />
        </FilterSection>

        {/* Date Range */}
        <FilterSection 
          title="Date Added" 
          defaultOpen={false}
          count={filters.createdAfter ? 1 : 0}
        >
          <div className="date-filter">
            <label className="date-filter-label">Added after:</label>
            <input
              type="date"
              value={filters.createdAfter || ''}
              onChange={(e) => onUpdateFilters({
                createdAfter: e.target.value || undefined
              })}
              className="date-filter-input"
            />
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}
