import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all cursor-pointer outline-none border-none';
    
    const variantClasses = {
      primary: 'bg-primary text-foreground hover:bg-primary-dark hover:scale-[1.02]',
      secondary: 'bg-secondary text-foreground hover:bg-secondary-dark hover:scale-[1.02]',
      ghost: 'bg-transparent text-foreground hover:bg-primary-darker',
    };
    
    const sizeClasses = {
      default: 'h-9 px-4 py-2 rounded-md text-sm',
      sm: 'h-8 px-3 text-xs rounded-md',
      lg: 'h-10 px-6 rounded-md',
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
