import React from 'react';

export default function WaveformBar({ count = 5, className = "", color = "bg-neon-purple" }) {
  return (
    <div className={`flex items-end gap-[2px] ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${color} animate-waveform`}
          style={{
            animationDelay: `${i * 0.15}s`,
            height: `${8 + Math.random() * 16}px`,
          }}
        />
      ))}
    </div>
  );
}