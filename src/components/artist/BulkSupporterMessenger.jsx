import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Mail, Send, Users, Music, Calendar, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    id: 'new_music',
    name: 'New Music Release',
    icon: Music,
    subject: '🎵 New Music Alert from {artist_name}!',
    body: `Hey {fan_name}!

I'm so excited to share my latest track with you! As one of my top supporters, you're the first to know.

🎶 Song: [Song Title]
🔗 Listen: [Link]

Your support means everything to me. Thank you for being part of this journey!

Much love,
{artist_name}`,
  },
  {
    id: 'tour_announcement',
    name: 'Tour Announcement',
    icon: Calendar,
    subject: '🎤 {artist_name} Live in Concert - Tour Dates Inside!',
    body: `Hey {fan_name}!

Big news - I'm hitting the road! 🎸

📍 Upcoming Shows:
[Date] - [Venue, City]
[Date] - [Venue, City]

As a valued supporter, I wanted you to know first. Hope to see you there!

Rock on,
{artist_name}`,
  },
  {
    id: 'milestone',
    name: 'Milestone Thank You',
    icon: Sparkles,
    subject: '✨ We Did It! Thank You from {artist_name}',
    body: `Hey {fan_name}!

WOW! Thanks to supporters like you, we just hit [milestone]! 🎉

[Resonance Score / Followers / Streams - pick one]

I couldn't have done this without you. You're amazing!

Here's to the next chapter together!

Gratefully,
{artist_name}`,
  },
  {
    id: 'custom',
    name: 'Custom Message',
    icon: Mail,
    subject: 'A Message from {artist_name}',
    body: `Hey {fan_name}!

[Write your message here...]

Thanks for your support!
{artist_name}`,
  },
];

export default function BulkSupporterMessenger({ artistProfileId, artistName, supporters = [] }) {
  const [selectedTemplate, setSelectedTemplate] = useState('new_music');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [sendBcc, setSendBcc] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load template
  React.useEffect(() => {
    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
      setSubject(template.subject.replace(/{artist_name}/g, artistName || 'Artist'));
      setMessage(template.body.replace(/{artist_name}/g, artistName || 'Artist'));
    }
  }, [selectedTemplate, artistName]);

  // Filter supporters by tier
  const filteredSupporters = supporters.filter(s => 
    selectedTier === 'all' ? true : s.tier === selectedTier
  );

  const sendBulkEmailsMutation = useMutation({
    mutationFn: async ({ subject, message, recipients }) => {
      // Invoke backend function to send emails via Gmail
      return await base44.functions.invoke('sendBulkSupporterEmails', {
        subject,
        message,
        recipient_emails: recipients,
        artist_name: artistName,
      });
    },
    onSuccess: () => {
      toast.success(`Sent to ${filteredSupporters.length} supporters!`);
      setIsSending(false);
    },
    onError: (error) => {
      toast.error('Failed to send emails');
      console.error(error);
      setIsSending(false);
    },
  });

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }

    if (filteredSupporters.length === 0) {
      toast.error('No supporters match your filter');
      return;
    }

    setIsSending(true);

    // Get supporter emails
    const supporterUserIds = filteredSupporters.map(s => s.fan_user_id).filter(Boolean);
    const supporterUsers = await base44.entities.User.filter({ id: supporterUserIds });
    const emails = supporterUsers
      .map(u => u.email)
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) {
      toast.error('No valid email addresses found');
      setIsSending(false);
      return;
    }

    sendBulkEmailsMutation.mutate({
      subject,
      message,
      recipients: emails,
    });
  };

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate);
  const TemplateIcon = currentTemplate?.icon || Mail;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-neon-cyan" />
          <h3 className="text-sm font-semibold">Bulk Supporter Messages</h3>
        </div>
        <NeonBadge color="cyan">{supporters.length} supporters</NeonBadge>
      </div>

      {/* Template Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {TEMPLATES.map(template => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-3 rounded-lg border transition-all text-left ${
                selectedTemplate === template.id
                  ? 'border-neon-cyan bg-neon-cyan/10'
                  : 'border-border/30 hover:border-neon-purple/30'
              }`}
            >
              <Icon className={`w-4 h-4 mb-2 ${
                selectedTemplate === template.id ? 'text-neon-cyan' : 'text-muted-foreground'
              }`} />
              <p className="text-xs font-medium">{template.name}</p>
            </button>
          );
        })}
      </div>

      {/* Recipient Filter */}
      <Card className="border-border/30">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-neon-purple" />
            Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Supporter Tier</Label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Supporters ({supporters.length})</SelectItem>
                <SelectItem value="basic">Basic Only</SelectItem>
                <SelectItem value="supporter">Supporter+</SelectItem>
                <SelectItem value="champion">Champion+</SelectItem>
                <SelectItem value="patron">Patron Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Send as BCC (Privacy)</Label>
            <Switch checked={sendBcc} onCheckedChange={setSendBcc} />
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredSupporters.length} supporters will receive this message
          </p>
        </CardContent>
      </Card>

      {/* Message Composer */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs mb-2 block">Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs mb-2 block">Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
            className="min-h-[200px] text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Variables: {'{artist_name}'}, {'{fan_name}'} will be auto-replaced
          </p>
        </div>
      </div>

      {/* Preview */}
      <GlassCard hover={false} className="p-4 bg-secondary/20">
        <h4 className="text-xs font-semibold mb-2">Preview:</h4>
        <div className="text-xs space-y-2">
          <p className="text-muted-foreground">
            <strong>To:</strong> {sendBcc ? 'BCC (hidden)' : 'All recipients'}
          </p>
          <p>
            <strong>Subject:</strong> {subject}
          </p>
          <div className="p-3 rounded-lg bg-card border border-border/30 whitespace-pre-wrap">
            {message}
          </div>
        </div>
      </GlassCard>

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={isSending || filteredSupporters.length === 0}
        className="w-full gap-2 bg-gradient-neon hover:opacity-90"
      >
        {isSending ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send to {filteredSupporters.length} Supporter{filteredSupporters.length !== 1 ? 's' : ''}
          </>
        )}
      </Button>
    </div>
  );
}