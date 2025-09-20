import React from 'react';
import { VerifiedBadge } from './VerifiedBadge';
import { cn } from '@/lib/utils';

interface ProfileNameWithBadgeProps {
  displayName: string;
  username?: string;
  isPro?: boolean;
  className?: string;
  nameClassName?: string;
  usernameClassName?: string;
  badgeSize?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  onClick?: () => void;
}

export const ProfileNameWithBadge: React.FC<ProfileNameWithBadgeProps> = ({
  displayName,
  username,
  isPro = false,
  className,
  nameClassName,
  usernameClassName,
  badgeSize = 'sm',
  showTooltip = false,
  onClick
}) => {
  return (
    <div
      className={cn('flex flex-col', className)}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        <span className={cn('font-medium', nameClassName)}>
          {displayName}
        </span>
        {isPro && (
          <VerifiedBadge
            size={badgeSize}
            showTooltip={showTooltip}
            className="ml-1"
          />
        )}
      </div>
      {username && (
        <span className={cn('text-muted-foreground text-sm', usernameClassName)}>
          @{username}
        </span>
      )}
    </div>
  );
};

export default ProfileNameWithBadge;
