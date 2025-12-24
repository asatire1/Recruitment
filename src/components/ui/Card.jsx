import './Card.css';

/**
 * Card component for content containers
 * @param {Object} props
 * @param {'default' | 'elevated' | 'bordered'} props.variant
 * @param {string} props.padding - CSS padding value
 * @param {React.ReactNode} props.children
 */
export default function Card({
  variant = 'default',
  padding,
  className = '',
  children,
  ...props
}) {
  const classes = [
    'card',
    `card-${variant}`,
    className
  ].filter(Boolean).join(' ');

  const style = padding ? { padding } : undefined;

  return (
    <div className={classes} style={style} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Header component
 */
export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={`card-header ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Title component
 */
export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3 className={`card-title ${className}`} {...props}>
      {children}
    </h3>
  );
}

/**
 * Card Description component
 */
export function CardDescription({ className = '', children, ...props }) {
  return (
    <p className={`card-description ${className}`} {...props}>
      {children}
    </p>
  );
}

/**
 * Card Body component
 */
export function CardBody({ className = '', children, ...props }) {
  return (
    <div className={`card-body ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Footer component
 */
export function CardFooter({ className = '', children, ...props }) {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  );
}
