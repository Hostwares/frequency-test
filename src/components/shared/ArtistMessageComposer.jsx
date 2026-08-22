import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import NeonBadge from '@/components/shared/NeonBadge';

const RECIPIENT_OPTIONS = [
  { value: 'all_supporters', label: 'All Supporters', color: 'cyan', desc: 'Everyone who supports you' },
  { value: 'top_supporters', label: 'Top Supporters', color: 'purple', desc: 'Your top 20% by amount' },
  { value: 'patron_tier', label: 'Patron Tier', color: 'magenta', desc: 'Patron-tier fans only' },
];

export default function ArtistMessageComposer({ artistProfile, supporterCount }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientType, setRecipientType] = useState('all_supporters');
  const [sent, setSent] = useState(false);
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () => base44.entities.ArtistMessage.create({
      artist_profile_id: artistProfile.id,
      artist_name: artistProfile.artist_name,
      subject,
      body,
      recipient_type: recipientType,
      read_by_fan_ids: [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-messages', artistProfile.id] });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
        setSubject('');
        setBody('');
        setRecipientType('all_supporters');
      }, 2000);
    },
  });

  const selectedRecipient = RECIPIENT_OPTIONS.find(o => o.value === recipientType);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neon-purple" />
          <h2 className="font-display font-semibold text-sm">Message Supporters</h2>
        </div>
        <Button
          size="sm"
          variant={open ? 'secondary' : 'default'}
          onClick={() => setOpen(v => !v)}
          className={open ? '' : 'bg-neon-purple hover:bg-neon-purple/90 text-white'}
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          {open ? 'Cancel' : 'New Message'}
        </Button>
      </div>

      {/* Compose form */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 gap-2"
              >
                <CheckCircle2 className="w-10 h-10 text-neon-cyan" />
                <p className="font-display font-semibold text-foreground">Message Sent!</p>
                <p className="text-xs text-muted-foreground">Your supporters will see it in their dashboard.</p>
              </motion.div>
            ) : (
              <div className="space-y-3 pt-2">
                {/* Recipient picker */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Send to</p>
                  <div className="flex gap-2 flex-wrap">
                    {RECIPIENT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setRecipientType(opt.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          recipientType === opt.value
                            ? 'border-neon-purple bg-neon-purple/15 text-neon-purple'
                            : 'border-border/40 text-muted-foreground hover:border-border'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{selectedRecipient?.desc} — {supporterCount} total supporters</p>
                </div>

                <Input
                  placeholder="Subject line..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="bg-secondary/50 border-border/50 text-sm"
                />
                <Textarea
                  placeholder="Write your message... (thank-you note, tour update, new release, etc.)"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={4}
                  className="bg-secondary/50 border-border/50 text-sm resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!subject.trim() || !body.trim() || sendMutation.isPending}
                    onClick={() => sendMutation.mutate()}
                    className="bg-neon-purple hover:bg-neon-purple/90 text-white"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {sendMutation.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sent messages list */}
      <SentMessageLog artistProfileId={artistProfile.id} />
    </div>
  );
}

function SentMessageLog({ artistProfileId }) {
  const { data: messages = [] } = useQuery({
    queryKey: ['artist-messages', artistProfileId],
    queryFn: () => base44.entities.ArtistMessage.filter({ artist_profile_id: artistProfileId }, '-created_date', 10),
    enabled: !!artistProfileId,
  });

  if (!messages.length) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-border/20">
      <p className="text-xs text-muted-foreground font-medium">Sent</p>
      {messages.map(msg => (
        <div key={msg.id} className="flex items-start gap-3 py-2 border-b border-border/10 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{msg.subject}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{msg.body}</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
              msg.recipient_type === 'patron_tier' ? 'border-neon-magenta/40 text-neon-magenta bg-neon-magenta/10' :
              msg.recipient_type === 'top_supporters' ? 'border-neon-purple/40 text-neon-purple bg-neon-purple/10' :
              'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10'
            }`}>
              {msg.recipient_type?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}