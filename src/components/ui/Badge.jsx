import './Badge.css';

/**
 * Badge component for status indicators and labels
 * @param {Object} props
 * @param {'gray' | 'primary' | 'success' | 'warning' | 'error' | 'info'} props.variant
 * @param {'sm' | 'md' | 'lg'} props.size
 * @param {boolean} props.dot - Show dot indicator
 * @param {React.ReactNode} props.children
 */
export default function Badge({
  variant = 'gray',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}) {
  const classes = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    dot && 'badge-dot',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {dot && <span className="badge-dot-indicator" />}
      {children}
    </span>
  );
}
