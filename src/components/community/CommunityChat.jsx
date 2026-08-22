import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Send, Pin, Trash2, Flag, Paperclip, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function CommunityChat({ community, eventId = null, currentUser }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const scrollRef = useRef(null);

  const isManager = community.manager_user_id === currentUser?.id;

  const { data: messages = [] } = useQuery({
    queryKey: ['community-messages', community.id, eventId],
    queryFn: async () => {
      const filter = { community_id: community.id, is_deleted: false };
      if (eventId) filter.event_id = eventId;
      else filter.event_id = { $or: [null, { $exists: false }] };
      return base44.entities.CommunityMessage.filter(filter, 'created_date', 100);
    },
  });

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = base44.entities.CommunityMessage.subscribe((event) => {
      if (event.data?.community_id === community.id) {
        qc.invalidateQueries({ queryKey: ['community-messages', community.id, eventId] });
      }
    });
    return () => unsubscribe();
  }, [community.id, eventId, qc]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: (data) => base44.entities.CommunityMessage.create(data),
    onSuccess: () => {
      setBody('');
      setAttachmentUrl('');
      qc.invalidateQueries({ queryKey: ['community-messages', community.id, eventId] });
    },
  });

  const handleSend = () => {
    if (!body.trim() || !currentUser) return;
    sendMessage.mutate({
      community_id: community.id,
      author_user_id: currentUser.id,
      author_name: currentUser.full_name || currentUser.email,
      body: body.trim(),
      attachments: attachmentUrl ? [attachmentUrl] : [],
      event_id: eventId || undefined,
    });
  };

  const deleteMessage = useMutation({
    mutationFn: (id) => base44.entities.CommunityMessage.update(id, { is_deleted: true, deleted_by: currentUser.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-messages', community.id, eventId] }),
  });

  const togglePin = useMutation({
    mutationFn: ({ id, pinned }) => base44.entities.CommunityMessage.update(id, { is_pinned: !pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-messages', community.id, eventId] }),
  });

  const pinned = messages.filter(m => m.is_pinned);
  const regular = messages.filter(m => !m.is_pinned);

  return (
    <div className="flex flex-col h-[500px]">
      {/* Pinned messages */}
      {pinned.length > 0 && (
        <div className="mb-2 space-y-1">
          {pinned.map(m => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/20 rounded-lg text-xs">
              <Pin className="w-3 h-3 text-neon-purple flex-shrink-0" />
              <span className="font-medium text-neon-purple">{m.author_name}:</span>
              <span className="text-muted-foreground truncate">{m.body}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
        {regular.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          regular.map(m => {
            const isOwn = m.author_user_id === currentUser?.id;
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] group ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{m.author_name}</p>
                  )}
                  <div className={`rounded-xl px-3 py-2 ${
                    isOwn
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-secondary/40 border border-border/30'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    {m.attachments?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.attachments.map((url, i) => (
                          <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-0.5 px-1 ${isOwn ? 'justify-end' : ''}`}>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(m.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {(isManager || isOwn) && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isManager && (
                          <button onClick={() => togglePin.mutate({ id: m.id, pinned: m.is_pinned })}
                            className="p-0.5 hover:text-neon-purple" title="Pin">
                            <Pin className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={() => deleteMessage.mutate(m.id)}
                          className="p-0.5 hover:text-destructive" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      {currentUser ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message..."
            className="flex-1"
          />
          {attachmentUrl && <NeonBadge color="cyan">📎 attached</NeonBadge>}
          <Button size="icon" onClick={handleSend} disabled={!body.trim() || sendMessage.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center mt-2">Log in to chat.</p>
      )}
    </div>
  );
}