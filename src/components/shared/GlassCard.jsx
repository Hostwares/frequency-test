import React from 'react';
import { motion } from 'framer-motion';

export default function GlassCard({ children, className = "", hover = true, glow = "", onClick }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        bg-card/80 backdrop-blur-md border border-border/50 rounded-xl
        ${hover ? 'cursor-pointer hover:border-primary/30' : ''}
        ${glow === 'purple' ? 'hover:glow-purple' : ''}
        ${glow === 'cyan' ? 'hover:glow-cyan' : ''}
        ${glow === 'magenta' ? 'hover:glow-magenta' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}