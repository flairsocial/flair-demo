import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  className,
  size = 'sm',
  showTooltip = false
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const iconSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-blue-500 text-white',
        sizeClasses[size],
        className
      )}
      title={showTooltip ? 'Verified' : undefined}
    >
      <Check className={cn('text-white', iconSizeClasses[size])} strokeWidth={3} />
    </div>
  );
};

export default VerifiedBadge;
