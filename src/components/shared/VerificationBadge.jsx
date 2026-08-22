import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, AlertCircle, Sparkles, User, Cpu, HelpCircle } from 'lucide-react';

const verificationConfig = {
  human_created: {
    label: 'Human Created',
    description: 'Created entirely by human artists',
    icon: <User className="w-3 h-3" />,
    color: 'bg-green-500/15 text-green-500 border-green-500/30',
    priority: 1,
  },
  human_assisted: {
    label: 'Human Assisted',
    description: 'Human-led with minor AI assistance',
    icon: <Sparkles className="w-3 h-3" />,
    color: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    priority: 2,
  },
  ai_assisted: {
    label: 'AI Assisted',
    description: 'Collaboration between human and AI',
    icon: <Cpu className="w-3 h-3" />,
    color: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
    priority: 3,
  },
  ai_generated: {
    label: 'AI Generated',
    description: 'Created primarily by AI',
    icon: <Sparkles className="w-3 h-3" />,
    color: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
    priority: 4,
  },
  pending: {
    label: 'Pending Verification',
    description: 'Awaiting review',
    icon: <HelpCircle className="w-3 h-3" />,
    color: 'bg-gray-500/15 text-gray-500 border-gray-500/30',
    priority: 5,
  },
};

export default function VerificationBadge({ verificationType, isVerified = false, showTooltip = true }) {
  const config = verificationConfig[verificationType] || verificationConfig.pending;

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1.5 ${config.color} text-xs font-medium`}
      title={showTooltip ? config.description : undefined}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

export function VerificationStatusBadge({ status }) {
  const statusConfig = {
    pending: {
      label: 'Pending',
      icon: <Circle className="w-3 h-3" />,
      color: 'bg-gray-500/15 text-gray-500 border-gray-500/30',
    },
    under_review: {
      label: 'Under Review',
      icon: <AlertCircle className="w-3 h-3" />,
      color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    },
    verified: {
      label: 'Verified',
      icon: <CheckCircle className="w-3 h-3" />,
      color: 'bg-green-500/15 text-green-500 border-green-500/30',
    },
    rejected: {
      label: 'Rejected',
      icon: <AlertCircle className="w-3 h-3" />,
      color: 'bg-red-500/15 text-red-500 border-red-500/30',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1.5 ${config.color} text-xs font-medium`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

export { verificationConfig };