// frontend/src/components/voice-clones/CloneStatusBadge.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Clock, CheckCircle, AlertTriangle, Cpu } from 'lucide-react';

const CloneStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: {
      text: 'Pending',
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50',
    },
    training: {
      text: 'Training',
      icon: Cpu,
      color: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 animate-pulse',
    },
    completed: {
      text: 'Completed',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50',
    },
    failed: {
      text: 'Failed',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50',
    },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${config.color}`}>
      <Icon size={14} />
      <span>{config.text}</span>
    </div>
  );
};

CloneStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

export default CloneStatusBadge;