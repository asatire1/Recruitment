import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import './DropdownMenu.css';

/**
 * Accessible dropdown menu with keyboard navigation
 */
export default function DropdownMenu({ 
  trigger, 
  items, 
  align = 'left',
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].focus();
    }
  }, [isOpen, activeIndex]);

  const handleKeyDown = useCallback((event) => {
    const enabledItems = items.filter(item => !item.disabled);
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        } else if (activeIndex >= 0 && items[activeIndex] && !items[activeIndex].disabled) {
          items[activeIndex].onClick?.();
          setIsOpen(false);
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        containerRef.current?.querySelector('button')?.focus();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex(prev => {
            let next = prev + 1;
            while (next < items.length && items[next].disabled) next++;
            return next < items.length ? next : prev;
          });
        }
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setActiveIndex(prev => {
            let next = prev - 1;
            while (next >= 0 && items[next].disabled) next--;
            return next >= 0 ? next : prev;
          });
        }
        break;
      
      case 'Home':
        event.preventDefault();
        if (isOpen) {
          const firstEnabled = items.findIndex(item => !item.disabled);
          setActiveIndex(firstEnabled);
        }
        break;
      
      case 'End':
        event.preventDefault();
        if (isOpen) {
          for (let i = items.length - 1; i >= 0; i--) {
            if (!items[i].disabled) {
              setActiveIndex(i);
              break;
            }
          }
        }
        break;
      
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, activeIndex, items]);

  const handleTriggerClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setActiveIndex(0);
    }
  };

  const handleItemClick = (item, index) => {
    if (item.disabled) return;
    item.onClick?.();
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      className={`dropdown-menu ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="dropdown-menu__trigger"
        onClick={handleTriggerClick}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
        <ChevronDown 
          size={16} 
          className={`dropdown-menu__chevron ${isOpen ? 'dropdown-menu__chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className={`dropdown-menu__content dropdown-menu__content--${align}`}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="dropdown-menu__divider" role="separator" />;
            }

            const Icon = item.icon;
            
            return (
              <button
                key={index}
                ref={el => itemRefs.current[index] = el}
                type="button"
                className={`dropdown-menu__item ${item.variant ? `dropdown-menu__item--${item.variant}` : ''} ${activeIndex === index ? 'dropdown-menu__item--active' : ''}`}
                role="menuitem"
                disabled={item.disabled}
                tabIndex={activeIndex === index ? 0 : -1}
                onClick={() => handleItemClick(item, index)}
              >
                {Icon && <Icon size={16} className="dropdown-menu__item-icon" aria-hidden="true" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
