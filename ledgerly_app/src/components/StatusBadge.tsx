import React from 'react';
import { TransactionStatus } from '@/models/Transaction';

interface StatusBadgeProps {
  status?: TransactionStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status = 'posted', className = '' }) => {
  const statusConfig = {
    posted: {
      label: '✅ Posted',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    },
    pending: {
      label: '⏳ Pending',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
    },
    cancelled: {
      label: '❌ Cancelled',
      bgColor: 'bg-gray-200',
      textColor: 'text-gray-600',
    },
  };

  const config = statusConfig[status] || statusConfig.posted;

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
