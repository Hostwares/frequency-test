import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, UserPlus, Crown, MessageSquare,
  ChevronDown, ChevronUp, Send, Trash2, Loader2, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { formatDistanceToNow } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FanCouncilCalendarSync from '@/components/council/FanCouncilCalendarSync';

function CouncilThread({ council, artistProfile, supporters }) {
  const [expanded, setExpanded] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [inviteId, setInviteId] = useState('');
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [meetingDate, setMeetingDate] = useState(null);
  const [meetingTitle, setMeetingTitle] = useState('');
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
      content: postContent,
      post_type: 'announcement',
    }),
    onSuccess: () => {
      setPostContent('');
      queryClient.invalidateQueries({ queryKey: ['council-posts', council.id] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (fanId) => base44.functions.invoke('fanCouncil', {
      action: 'invite_fan',
      council_id: council.id,
      fan_id: fanId,
    }),
    onSuccess: () => {
      setInviteId('');
      queryClient.invalidateQueries({ queryKey: ['my-councils', artistProfile.id] });
    },
  });

  const removeMember = useMutation({
    mutationFn: (fanId) => base44.functions.invoke('fanCouncil', {
      action: 'remove_member',
      council_id: council.id,
      fan_id: fanId,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-councils', artistProfile.id] }),
  });

  const scheduleMeeting = useMutation({
    mutationFn: async () => {
      if (!meetingDate || !meetingTitle) throw new Error('Missing meeting details');
      return base44.functions.invoke('scheduleCouncilMeeting', {
        council_id: council.id,
        title: meetingTitle,
        description: `Fan Council meeting for ${council.name}`,
        date: meetingDate.toISOString(),
        duration_minutes: 60,
        is_virtual: true,
      });
    },
    onSuccess: () => {
      setMeetingDate(null);
      setMeetingTitle('');
      setShowScheduleMeeting(false);
      queryClient.invalidateQueries({ queryKey: ['my-councils', artistProfile.id] });
    },
  });

  // Suggest top supporters not yet in the council
  const suggestedFans = supporters
    .filter(s => !council.member_fan_ids?.includes(s.fan_user_id) && !council.invited_fan_ids?.includes(s.fan_user_id))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);

  return (
    <GlassCard hover={false} className="overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/10 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-neon-purple/10 flex items-center justify-center flex-shrink-0">
          <Crown className="w-4 h-4 text-neon-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{council.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {(council.member_fan_ids || []).length} members · {(council.invited_fan_ids || []).length} pending
          </p>
        </div>
        <NeonBadge color="purple">{council.is_active ? 'Active' : 'Inactive'}</NeonBadge>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/20"
          >
            <div className="p-4 space-y-5">
              {/* Invite top supporters */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Invite Top Supporters</p>
                <div className="space-y-2 mb-3">
                  {suggestedFans.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 border border-border/20">
                      <div>
                        <p className="text-xs font-medium">Fan — <span className="text-neon-cyan">${s.amount}/mo</span></p>
                        <p className="text-[10px] text-muted-foreground">{s.tier} tier</p>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        className="text-[10px] h-7 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10"
                        onClick={() => inviteMutation.mutate(s.fan_user_id)}
                        disabled={inviteMutation.isPending}
                      >
                        <UserPlus className="w-3 h-3 mr-1" /> Invite
                      </Button>
                    </div>
                  ))}
                  {suggestedFans.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">All top supporters have been invited.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Or enter fan user ID…"
                    value={inviteId}
                    onChange={e => setInviteId(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" onClick={() => inviteId && inviteMutation.mutate(inviteId)} disabled={!inviteId || inviteMutation.isPending}
                    className="bg-neon-purple/20 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/30 h-8">
                    <UserPlus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Schedule Meeting */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled Meetings</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowScheduleMeeting(v => !v)}
                    className="text-[10px] h-6 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10"
                  >
                    <Calendar className="w-3 h-3 mr-1" /> Schedule
                  </Button>
                </div>

                <AnimatePresence>
                  {showScheduleMeeting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-3 p-3 rounded-lg bg-secondary/20 border border-border/20 space-y-3"
                    >
                      <Input
                        placeholder="Meeting title"
                        value={meetingTitle}
                        onChange={e => setMeetingTitle(e.target.value)}
                        className="text-xs h-8"
                      />
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {meetingDate ? meetingDate.toLocaleString() : 'Pick date & time'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={meetingDate}
                              onSelect={setMeetingDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          size="sm"
                          onClick={() => meetingDate && meetingTitle && scheduleMeeting.mutate()}
                          disabled={!meetingDate || !meetingTitle || scheduleMeeting.isPending}
                          className="h-8 text-xs bg-gradient-neon text-white"
                        >
                          {scheduleMeeting.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Display scheduled meetings */}
                {(council.scheduled_meetings || []).length > 0 && (
                  <div className="space-y-2">
                    {council.scheduled_meetings.map(meeting => (
                      <div key={meeting.id} className="px-3 py-2 rounded-lg bg-neon-purple/5 border border-neon-purple/20 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-3 h-3 text-neon-purple" />
                          <span className="font-semibold text-neon-purple">{meeting.title}</span>
                          {meeting.reminders_sent && (
                            <NeonBadge color="cyan" className="text-[9px]">Reminder sent</NeonBadge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(meeting.date).toLocaleString()} · {meeting.duration_minutes} min
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Members */}
              {(council.member_fan_ids || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Members</p>
                  <div className="flex flex-wrap gap-2">
                    {council.member_fan_ids.map(fanId => (
                      <div key={fanId} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-[10px]">
                        <span className="text-neon-cyan font-mono">{fanId.slice(-6)}</span>
                        <button onClick={() => removeMember.mutate(fanId)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts feed */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Council Thread</p>
                <div className="space-y-2 max-h-52 overflow-y-auto mb-3">
                  {posts.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-4">No posts yet — start the conversation.</p>
                  )}
                  {posts.map(post => (
                    <div key={post.id} className={`px-3 py-2 rounded-lg border text-xs ${
                      post.author_role === 'artist'
                        ? 'bg-neon-purple/5 border-neon-purple/20'
                        : 'bg-secondary/20 border-border/20'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`font-semibold ${post.author_role === 'artist' ? 'text-neon-purple' : 'text-neon-cyan'}`}>
                          {post.author_name}
                        </span>
                        <NeonBadge color={post.author_role === 'artist' ? 'purple' : 'cyan'} className="text-[9px]">
                          {post.post_type}
                        </NeonBadge>
                        <span className="text-muted-foreground/60 text-[10px] ml-auto">
                          {post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <p className="text-foreground/90 leading-snug">{post.content}</p>
                      {(post.upvotes || 0) > 0 && (
                        <p className="text-[10px] text-neon-turquoise mt-1">▲ {post.upvotes}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Post an update or question to the council…"
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    className="text-xs min-h-[60px] resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={() => postContent.trim() && postMutation.mutate()}
                    disabled={!postContent.trim() || postMutation.isPending}
                    className="bg-gradient-neon text-white self-end h-9 w-9 p-0"
                  >
                    {postMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

export default function ArtistCouncilManager({ artistProfile, supporters }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const queryClient = useQueryClient();

  const { data: councils = [] } = useQuery({
    queryKey: ['my-councils', artistProfile?.id],
    queryFn: () => base44.entities.FanCouncil.filter({ artist_profile_id: artistProfile.id }),
    enabled: !!artistProfile?.id,
  });

  const createMutation = useMutation({
    mutationFn: () => base44.functions.invoke('fanCouncil', {
      action: 'create_council',
      artist_profile_id: artistProfile.id,
      artist_name: artistProfile.artist_name,
      name: newName,
      description: newDesc,
    }),
    onSuccess: () => {
      setNewName('');
      setNewDesc('');
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ['my-councils', artistProfile.id] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-neon-purple" />
          <h2 className="font-display font-semibold text-sm">Fan Councils</h2>
          {councils.length > 0 && <NeonBadge color="purple">{councils.length}</NeonBadge>}
        </div>
        <Button size="sm" variant="outline"
          onClick={() => setCreating(v => !v)}
          className="text-xs border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 h-7">
          <Plus className="w-3 h-3 mr-1" /> New Council
        </Button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl border border-neon-purple/20 bg-neon-purple/5 space-y-3">
            <Input placeholder="Council name (e.g. Inner Circle)" value={newName} onChange={e => setNewName(e.target.value)} className="text-sm" />
            <Textarea placeholder="What's this council for? (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="text-sm min-h-[60px] resize-none" />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={() => newName.trim() && createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending}
                className="text-xs bg-gradient-neon text-white">
                {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create Council'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {councils.length === 0 && !creating ? (
        <div className="text-center py-8 border border-dashed border-border/30 rounded-xl">
          <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No councils yet. Create one to invite top supporters for direct feedback.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {councils.map(council => (
            <CouncilThread key={council.id} council={council} artistProfile={artistProfile} supporters={supporters} />
          ))}
        </div>
      )}

      {/* Calendar Sync */}
      <FanCouncilCalendarSync />
    </div>
  );
}