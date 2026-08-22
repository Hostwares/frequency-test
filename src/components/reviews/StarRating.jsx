import React, { useState } from 'react';
import { Star } from 'lucide-react';

// Reusable star rating: interactive input when `onChange` is provided,
// otherwise a read-only display.
export default function StarRating({ value = 0, onChange, size = 18, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const interactive = !readOnly && !!onChange;
  const active = hover || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange(n)}
          className={interactive ? 'cursor-pointer p-0' : 'cursor-default p-0'}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={
              active >= n
                ? 'fill-neon-purple text-neon-purple'
                : 'text-muted-foreground/40'
            }
          />
        </button>
      ))}
    </div>
  );
}