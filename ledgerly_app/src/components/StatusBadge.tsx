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
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-800 dark:text-emerald-300',
      borderColor: 'border-emerald-300 dark:border-emerald-700',
      dotColor: 'bg-emerald-500',
    },
    pending: {
      label: 'Pending',
      icon: '⏳',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      textColor: 'text-amber-800 dark:text-amber-300',
      borderColor: 'border-amber-300 dark:border-amber-700',
      dotColor: 'bg-amber-500',
    },
    cancelled: {
      label: 'Cancelled',
      icon: '❌',
      bgColor: 'bg-slate-100 dark:bg-slate-800/50',
      textColor: 'text-slate-700 dark:text-slate-400',
      borderColor: 'border-slate-300 dark:border-slate-600',
      dotColor: 'bg-slate-500',
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
