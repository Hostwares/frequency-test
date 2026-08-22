import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIER_GRADIENTS = {
  bronze: 'from-amber-700/20 to-amber-600/20 border-amber-600/30',
  silver: 'from-slate-400/20 to-slate-300/20 border-slate-300/30',
  gold: 'from-yellow-500/20 to-amber-400/20 border-yellow-400/30',
  platinum: 'from-cyan-400/20 to-blue-400/20 border-cyan-400/30',
  diamond: 'from-purple-400/20 to-pink-400/20 border-purple-400/30',
};

const TIER_GLOWS = {
  bronze: 'shadow-amber-500/20',
  silver: 'shadow-slate-400/20',
  gold: 'shadow-yellow-400/20',
  platinum: 'shadow-cyan-400/20',
  diamond: 'shadow-purple-400/20',
};

export default function BadgeUnlockModal({ badgeType, badgeTier, badgeName, icon, onClose }) {
  const gradientClass = TIER_GRADIENTS[badgeTier] || TIER_GRADIENTS.bronze;
  const glowClass = TIER_GLOWS[badgeTier] || TIER_GLOWS.bronze;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 15 }}
        className="relative max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: Math.random() * 400 - 200, y: Math.random() * 400 - 200 }}
              animate={{ 
                opacity: [0, 1, 0], 
                x: Math.random() * 400 - 200, 
                y: Math.random() * 600 - 300 
              }}
              transition={{ duration: 1.5, delay: Math.random() * 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: ['#a855f7', '#06b6d4', '#d946ef', '#fbbf24'][Math.floor(Math.random() * 4)] }}
            />
          ))}
        </div>

        {/* Card */}
        <div className={`relative bg-gradient-to-br ${gradientClass} rounded-3xl p-1 shadow-2xl ${glowClass}`}>
          <div className="bg-card/95 backdrop-blur rounded-[22px] p-8 text-center">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Badge Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border-2 border-neon-purple/30 flex items-center justify-center text-5xl shadow-lg"
            >
              {icon}
            </motion.div>

            {/* Badge Name */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-display font-bold mb-2"
            >
              {badgeName} Unlocked!
            </motion.h2>

            {/* Tier Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-neon-purple/10 to-neon-cyan/10 border border-neon-purple/30 mb-4"
            >
              <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${gradientClass}`} />
              <span className="text-xs font-bold capitalize">{badgeTier} Tier</span>
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground mb-6"
            >
              Congratulations! You've earned this badge through your amazing support on Frequency.
            </motion.p>

            {/* Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={onClose}
                className="w-full bg-gradient-neon hover:opacity-90 text-white font-semibold"
              >
                Awesome! Keep Exploring
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}