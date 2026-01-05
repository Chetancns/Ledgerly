import React from 'react';
import { TransactionStatus } from '@/models/Transaction';

interface StatusBadgeProps {
  status?: TransactionStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status = 'posted', 
  className = '',
  size = 'md',
  showLabel = true
}) => {
  const statusConfig = {
    posted: {
      label: 'Posted',
      icon: '✅',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-800 dark:text-green-300',
      borderColor: 'border-green-300 dark:border-green-600',
      dotColor: 'bg-green-500',
    },
    pending: {
      label: 'Pending',
      icon: '⏳',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-800 dark:text-yellow-300',
      borderColor: 'border-yellow-300 dark:border-yellow-600',
      dotColor: 'bg-yellow-500',
    },
    cancelled: {
      label: 'Cancelled',
      icon: '❌',
      bgColor: 'bg-gray-100 dark:bg-gray-800/50',
      textColor: 'text-gray-700 dark:text-gray-400',
      borderColor: 'border-gray-300 dark:border-gray-600',
      dotColor: 'bg-gray-500',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const config = statusConfig[status] || statusConfig.posted;

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses[size]}
        backdrop-blur-sm transition-all duration-200
        ${className}
      `}
      role="status"
      aria-label={`Transaction status: ${config.label}`}
    >
      <span className={`rounded-full ${config.dotColor} ${dotSizeClasses[size]} animate-pulse`} />
      {showLabel && (
        <>
          <span className="font-medium">{config.label}</span>
        </>
      )}
    </span>
  );
};

export default StatusBadge;
