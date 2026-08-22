import React from 'react';
import NeonBadge from '@/components/shared/NeonBadge';

const rotationStatusConfig = {
  received: { label: 'Received', color: 'blue', icon: null },
  reviewing: { label: 'Reviewing', color: 'purple', icon: null },
  saved: { label: 'Saved', color: 'secondary', icon: null },
  added: { label: 'Added', color: 'cyan', icon: null },
  light_rotation: { label: 'Light Rotation', color: 'blue', icon: '📻' },
  medium_rotation: { label: 'Medium Rotation', color: 'purple', icon: '📻' },
  heavy_rotation: { label: 'Heavy Rotation', color: 'magenta', icon: '🔥' },
  featured: { label: 'Featured', color: 'cyan', icon: '⭐' },
};

export function RotationStatusBadge({ status, showDescription = false }) {
  const config = rotationStatusConfig[status] || rotationStatusConfig.received;
  
  if (showDescription) {
    return (
      <div className="flex items-center gap-2">
        <NeonBadge color={config.color}>
          {config.icon && <span className="mr-1">{config.icon}</span>}
          {config.label}
        </NeonBadge>
        <span className="text-xs text-muted-foreground">
          {status === 'heavy_rotation' ? 'Currently Spinning' : status === 'featured' ? 'Priority Rotation' : 'In Rotation'}
        </span>
      </div>
    );
  }
  
  return (
    <NeonBadge color={config.color}>
      {config.icon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </NeonBadge>
  );
}

export function ReviewPriorityBadge({ priority }) {
  const color = priority === 'high' ? 'magenta' : priority === 'medium' ? 'purple' : 'blue';
  return <NeonBadge color={color}>{priority || 'medium'} priority</NeonBadge>;
}

export function ReviewStatusBadge({ status }) {
  const config = {
    pending: { label: 'Needs Review', color: 'blue' },
    shortlist: { label: 'Shortlisted', color: 'cyan' },
    rejected: { label: 'Rejected', color: 'destructive' },
  };
  const conf = config[status] || config.pending;
  return <NeonBadge color={conf.color}>{conf.label}</NeonBadge>;
}

export default RotationStatusBadge;