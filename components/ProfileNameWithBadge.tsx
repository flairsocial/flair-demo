import React from 'react';
import Link from 'next/link';
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
  href?: string;
  clickable?: boolean;
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
  onClick,
  href,
  clickable = false
}) => {
  const content = (
    <div
      className={cn(
        'flex flex-col',
        clickable && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
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

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export default ProfileNameWithBadge;
