import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, Music, Calendar, Send } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SupporterUpdates({ artistProfileId, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageType, setMessageType] = useState('general_update');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('top_10');
  const queryClient = useQueryClient();

  const { data: allocations = [] } = useQuery({
    queryKey: ['artist-supporters', artistProfileId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      artist_profile_id: artistProfileId,
      is_active: true 
    }, '-amount'),
    enabled: !!artistProfileId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['artist-sent-messages', artistProfileId],
    queryFn: () => base44.entities.ArtistMessage.filter({ 
      artist_profile_id: artistProfileId,
      sender_type: 'artist'
    }, '-created_date'),
    enabled: !!artistProfileId,
  });

  const sendUpdateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendSupporterUpdate', {
        artist_profile_id: artistProfileId,
        artist_user_id: userId,
        ...data,
      });
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['artist-sent-messages'] });
      setIsOpen(false);
      setSubject('');
      setMessage('');
      toast.success(`Update sent to ${result.sent_count} supporters!`);
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  const getTopSupporters = () => {
    if (recipientFilter === 'all') return allocations;
    if (recipientFilter === 'top_10') return allocations.slice(0, 10);
    if (recipientFilter === 'top_25') return allocations.slice(0, 25);
    if (recipientFilter === 'top_50') return allocations.slice(0, 50);
    return allocations.slice(0, 10);
  };

  const topSupporters = getTopSupporters();
  const updateMessages = messages.filter(m => ['new_music', 'tour_announcement', 'general_update', 'supporter_update'].includes(m.message_type));

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    sendUpdateMutation.mutate({
      subject,
      message,
      message_type: messageType,
      recipient_filter: recipientFilter,
    });
  };

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-magenta/10 border border-neon-magenta/20">
            <Mail className="w-5 h-5 text-neon-magenta" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Supporter Updates</h2>
            <p className="text-xs text-muted-foreground">Share news with your fans</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Send className="w-4 h-4 mr-2" />
              Compose Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Supporter Update</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Update Type</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_update">General Update</SelectItem>
                    <SelectItem value="new_music">New Music Release</SelectItem>
                    <SelectItem value="tour_announcement">Tour Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Recipients</Label>
                <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Supporters ({allocations.length})</SelectItem>
                    <SelectItem value="top_10">Top 10</SelectItem>
                    <SelectItem value="top_25">Top 25</SelectItem>
                    <SelectItem value="top_50">Top 50</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {topSupporters.length} supporter{topSupporters.length !== 1 ? 's' : ''} will receive this
                </p>
              </div>

              <div>
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Exciting news!"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your update here..."
                  className="min-h-[150px] mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={sendUpdateMutation.isPending || !subject.trim() || !message.trim()}
                  className="bg-neon-purple hover:bg-neon-purple/90"
                >
                  {sendUpdateMutation.isPending ? 'Sending...' : `Send to ${topSupporters.length}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Recent Updates</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {updateMessages.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No updates sent yet</p>
            </div>
          ) : (
            updateMessages.slice(0, 8).map((msg) => (
              <div key={msg.id} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {msg.message_type === 'new_music' && <Music className="w-3.5 h-3.5 text-neon-purple" />}
                      {msg.message_type === 'tour_announcement' && <Calendar className="w-3.5 h-3.5 text-neon-cyan" />}
                      <NeonBadge color={msg.message_type === 'new_music' ? 'purple' : msg.message_type === 'tour_announcement' ? 'cyan' : 'magenta'}>
                        update
                      </NeonBadge>
                    </div>
                    <p className="text-sm font-medium truncate">{msg.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{msg.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(msg.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassCard>
  );
}