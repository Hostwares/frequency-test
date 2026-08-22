import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { BarChart3, Plus, Pin, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function CommunityPolls({ community, currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);

  const isManager = community.manager_user_id === currentUser?.id;

  const { data: polls = [] } = useQuery({
    queryKey: ['community-polls', community.id],
    queryFn: () => base44.entities.CommunityPoll.filter({ community_id: community.id, is_active: true }, '-created_date', 50),
  });

  const createPoll = useMutation({
    mutationFn: (data) => base44.entities.CommunityPoll.create(data),
    onSuccess: () => {
      setShowForm(false);
      setQuestion(''); setDescription(''); setOptions(['', '']);
      qc.invalidateQueries({ queryKey: ['community-polls', community.id] });
    },
  });

  const vote = useMutation({
    mutationFn: async ({ poll, optionIndex }) => {
      const existing = (poll.votes || []).filter(v => v.user_id !== currentUser.id);
      const newVotes = [...existing, { user_id: currentUser.id, option_index: optionIndex }];
      return base44.entities.CommunityPoll.update(poll.id, { votes: newVotes });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-polls', community.id] }),
  });

  const closePoll = useMutation({
    mutationFn: (id) => base44.entities.CommunityPoll.update(id, { is_active: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-polls', community.id] }),
  });

  const togglePin = useMutation({
    mutationFn: ({ id, pinned }) => base44.entities.CommunityPoll.update(id, { is_pinned: !pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-polls', community.id] }),
  });

  const handleCreate = () => {
    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;
    createPoll.mutate({
      community_id: community.id,
      author_user_id: currentUser.id,
      author_name: currentUser.full_name || currentUser.email,
      question: question.trim(),
      description: description.trim() || undefined,
      options: validOptions,
    });
  };

  const getVoteCount = (poll, idx) => (poll.votes || []).filter(v => v.option_index === idx).length;
  const getTotalVotes = (poll) => (poll.votes || []).length;
  const getUserVote = (poll) => (poll.votes || []).find(v => v.user_id === currentUser?.id);

  return (
    <div className="space-y-3">
      {currentUser && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            {showForm ? <><X className="w-3.5 h-3.5" />Cancel</> : <><Plus className="w-3.5 h-3.5" />New Poll</>}
          </Button>
        </div>
      )}

      {showForm && (
        <GlassCard hover={false} className="p-4 space-y-3 border-primary/20">
          <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Poll question..." />
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add context (optional)" rows={2} />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={opt} onChange={e => setOptions(o => o.map((v, j) => j === i ? e.target.value : v))}
                  placeholder={`Option ${i + 1}`} className="flex-1" />
                {options.length > 2 && (
                  <button onClick={() => setOptions(o => o.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <Button size="sm" variant="ghost" onClick={() => setOptions(o => [...o, ''])} className="gap-1 text-xs">
              <Plus className="w-3 h-3" />Add option
            </Button>
          )}
          <Button size="sm" onClick={handleCreate} disabled={!question.trim() || options.filter(o => o.trim()).length < 2 || createPoll.isPending}>
            Create Poll
          </Button>
        </GlassCard>
      )}

      {polls.length === 0 && !showForm ? (
        <GlassCard hover={false} className="p-10 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No polls yet. Create one to gather the community's opinion.</p>
        </GlassCard>
      ) : (
        polls.map(poll => {
          const total = getTotalVotes(poll);
          const userVote = getUserVote(poll);
          const isClosed = !poll.is_active;
          return (
            <GlassCard key={poll.id} hover={false} className={`p-4 ${poll.is_pinned ? 'border-neon-purple/30' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {poll.is_pinned && <Pin className="w-3 h-3 text-neon-purple" />}
                    <h4 className="font-medium text-sm">{poll.question}</h4>
                  </div>
                  {poll.description && <p className="text-xs text-muted-foreground mb-1">{poll.description}</p>}
                  <p className="text-[10px] text-muted-foreground">by {poll.author_name} · {total} votes{isClosed ? ' · Closed' : ''}</p>
                </div>
                {isManager && (
                  <div className="flex gap-1">
                    <button onClick={() => togglePin.mutate({ id: poll.id, pinned: poll.is_pinned })}
                      className="p-1 hover:text-neon-purple" title="Pin">
                      <Pin className={`w-3.5 h-3.5 ${poll.is_pinned ? 'fill-current text-neon-purple' : ''}`} />
                    </button>
                    {!isClosed && (
                      <button onClick={() => closePoll.mutate(poll.id)} className="text-[10px] text-muted-foreground hover:text-destructive" title="Close poll">
                        Close
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                {poll.options.map((opt, idx) => {
                  const count = getVoteCount(poll, idx);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const isSelected = userVote?.option_index === idx;
                  return (
                    <button
                      key={idx}
                      disabled={!currentUser || isClosed}
                      onClick={() => vote.mutate({ poll, optionIndex: idx })}
                      className={`w-full text-left relative overflow-hidden rounded-lg border px-3 py-2 transition-colors ${
                        isSelected ? 'border-primary/40 bg-primary/10' : 'border-border/30 hover:border-border/50'
                      } ${(!currentUser || isClosed) ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="absolute inset-0 bg-primary/5" style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center justify-between">
                        <span className="text-sm flex items-center gap-1.5">
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary" />}
                          {opt}
                        </span>
                        <span className="text-xs text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!currentUser && <p className="text-[10px] text-muted-foreground mt-2">Log in to vote.</p>}
            </GlassCard>
          );
        })
      )}
    </div>
  );
}