import React from 'react';
import { useNavigate } from 'react-router-dom';

const HANDLE_REGEX = /!([a-z0-9_]{3,30})/gi;

export default function ArtistHandleText({ children, className = '' }) {
  const navigate = useNavigate();
  const text = typeof children === 'string' ? children : '';

  if (!text) return <span className={className}>{children}</span>;

  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(HANDLE_REGEX);

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const handle = match[1].toLowerCase();
    parts.push(
      <span
        key={`${handle}-${match.index}`}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/artist/${handle}`);
        }}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/artist/${handle}`)}
        className="font-mono text-neon-cyan hover:text-neon-cyan/80 cursor-pointer underline-offset-2 hover:underline transition-colors"
      >
        !{handle}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}