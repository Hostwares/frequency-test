import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ArtistHandle({ handle, size = 'sm', className = '', clickable = true }) {
  const navigate = useNavigate();
  if (!handle) return null;

  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const content = (
    <span className={`font-mono text-neon-cyan/90 font-medium ${sizes[size]} ${className}`}>
      !{handle}
    </span>
  );

  if (!clickable) return content;

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/artist/${handle}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/artist/${handle}`)}
      className="cursor-pointer hover:text-neon-cyan transition-colors"
    >
      {content}
    </span>
  );
}