import React from 'react';
import { Badge } from '@/components/ui/badge';

const variants = {
  purple: 'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
  cyan: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30',
  magenta: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30',
  blue: 'bg-neon-blue/15 text-neon-blue border-neon-blue/30',
  turquoise: 'bg-neon-turquoise/15 text-neon-turquoise border-neon-turquoise/30',
};

export default function NeonBadge({ children, color = "purple", className = "" }) {
  return (
    <Badge variant="outline" className={`${variants[color]} text-xs font-medium ${className}`}>
      {children}
    </Badge>
  );
}