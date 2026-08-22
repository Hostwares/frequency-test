import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, ChevronDown, ChevronUp, Send,
  ThumbsUp, Loader2, CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import NeonBadge from '@/components/shared/NeonBadge';
import { formatDistanceToNow } from 'date-fns';
import FanCouncilCalendarSync from '@/components/council/FanCouncilCalendarSync';

const TYPE_COLORS = { feedback: 'cyan', question: 'blue', announcement: 'purple', poll: 'magenta' };

function CouncilThread({ council, user }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { data: posts = [] } = useQuery({
    queryKey: ['council-posts', council.id],
    queryFn: () => base44.entities.CouncilPost.filter({ council_id: council.id }, '-created_date', 50),
    enabled: expanded,
  });

  const postMutation = useMutation({
    mutationFn: () => base44.functions.invoke('fanCouncil', {
      action: 'post_feedback',
      council_id: council.id,
      content,
      post_type: 'feedback',
    }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['council-posts', council.id] });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: (post) => base44.functions.invoke('fanCouncil', {
      action: 'upvote',
      post_id: post.id,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['council-posts', council.id] }),
  });

  const acceptMutation = useMutation({
    mutationFn: () => base44.functions.invoke('fanCouncil', {
      action: 'accept_invite',
      council_id: council.id,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fan-councils', user.id] }),
  });

  const isPending = council.invited_fan_ids?.includes(user.id) && !council.member_fan_ids?.includes(user.id);
  const isMember = council.member_fan_ids?.includes(user.id);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden ${isPending ? 'border-neon-purple/40 bg-neon-purple/5' : 'border-border/30 bg-secondary/10'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3.5">
        <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center flex-shrink-0">
          <Crown className="w-3.5 h-3.5 text-neon-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{council.name}</p>
          <p className="text-[10px] text-muted-foreground">{council.artist_name}</p>
        </div>
        {isPending ? (
          <Button size="sm" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}
            className="text-xs bg-gradient-neon text-white h-7 px-3">
            {acceptMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join'}
          </Button>
        ) : isMember ? (
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <NeonBadge color="cyan">Member</NeonBadge>
            {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </button>
        ) : null}
      </div>

      {/* Council description if pending */}
      {isPending && council.description && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">{council.description}</p>
      )}

      {/* Thread (members only) */}
      <AnimatePresence>
        {expanded && isMember && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/20">
            <div className="p-4 space-y-4">
              {/* Posts */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {posts.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4">Be the first to share feedback!</p>
                )}
                {posts.map(post => {
                  const alreadyUpvoted = post.upvoted_by?.includes(user.id);
                  return (
                    <div key={post.id} className={`px-3 py-2.5 rounded-lg border text-xs ${
                      post.author_role === 'artist'
                        ? 'bg-neon-purple/5 border-neon-purple/20'
                        : 'bg-secondary/20 border-border/20'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`font-semibold ${post.author_role === 'artist' ? 'text-neon-purple' : 'text-neon-cyan'}`}>
                          {post.author_name}
                        </span>
                        <NeonBadge color={TYPE_COLORS[post.post_type] || 'cyan'} className="text-[9px]">
                          {post.post_type}
                        </NeonBadge>
                        <span className="text-muted-foreground/50 text-[10px] ml-auto">
                          {post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <p className="text-foreground/90 leading-snug">{post.content}</p>
                      <button
                        onClick={() => !alreadyUpvoted && upvoteMutation.mutate(post)}
                        disabled={alreadyUpvoted}
                        className={`flex items-center gap-1 mt-1.5 text-[10px] transition-colors ${
                          alreadyUpvoted ? 'text-neon-turquoise' : 'text-muted-foreground hover:text-neon-turquoise'
                        }`}
                      >
                        <ThumbsUp className="w-2.5 h-2.5" />
                        {post.upvotes || 0}
                        {alreadyUpvoted && <CheckCheck className="w-2.5 h-2.5 ml-0.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Reply */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Share your feedback or a question…"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="text-xs min-h-[56px] resize-none"
                />
                <Button size="sm" onClick={() => content.trim() && postMutation.mutate()}
                  disabled={!content.trim() || postMutation.isPending}
                  className="bg-gradient-neon text-white self-end h-9 w-9 p-0">
                  {postMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FanCouncilInbox({ user }) {
  // Fetch councils where this fan is invited or is a member
  const { data: allCouncils = [] } = useQuery({
    queryKey: ['fan-councils', user?.id],
    queryFn: async () => {
      // Fetch all active councils — filter client side for invited/member
      const all = await base44.entities.FanCouncil.filter({ is_active: true }, '-created_date', 100);
      return all.filter(c =>
        c.member_fan_ids?.includes(user.id) || c.invited_fan_ids?.includes(user.id)
      );
    },
    enabled: !!user?.id,
  });

  const pendingCount = allCouncils.filter(c => c.invited_fan_ids?.includes(user?.id) && !c.member_fan_ids?.includes(user?.id)).length;

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-neon-purple" />
        <h2 className="font-display font-semibold text-sm">Fan Councils</h2>
        {pendingCount > 0 && <NeonBadge color="purple">{pendingCount} invite{pendingCount > 1 ? 's' : ''}</NeonBadge>}
      </div>

      {allCouncils.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/30 rounded-xl">
          <Crown className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No council invites yet — keep supporting artists to earn a spot!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCouncils.map(c => <CouncilThread key={c.id} council={c} user={user} />)}
        </div>
      )}

      {/* Calendar Sync */}
      <FanCouncilCalendarSync />
    </div>
  );
}