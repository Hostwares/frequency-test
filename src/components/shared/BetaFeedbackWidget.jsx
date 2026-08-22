import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useBetaConfig } from '@/hooks/useBetaConfig';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select';
import { MessageSquareText, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function BetaFeedbackWidget() {
  const { user } = useAuth();
  const { config } = useBetaConfig();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Only surface during an active beta period with feedback enabled
  if (!user || !(config.beta_mode_enabled && config.beta_feedback_enabled)) return null;

  const reset = () => { setSubject(''); setMessage(''); setType('bug'); };

  const submit = async () => {
    if (!message.trim()) {
      toast({ title: 'Please describe your feedback', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.BetaFeedback.create({
        feedback_type: type,
        subject: subject.trim(),
        message: message.trim(),
        page_path: window.location.pathname,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        user_agent: navigator.userAgent,
        status: 'new'
      });
      toast({ title: 'Thank you! Your feedback was sent.' });
      setOpen(false);
      reset();
      qc.invalidateQueries(['beta-feedback']);
    } catch (e) {
      toast({ title: 'Could not send feedback', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const typeIcon = { bug: Bug, suggestion: Lightbulb, other: HelpCircle };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-neon text-white font-medium text-sm shadow-lg glow-purple hover:scale-105 transition-transform"
        aria-label="Submit beta feedback"
      >
        <MessageSquareText className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <MessageSquareText className="w-5 h-5 text-neon-purple" />
              Beta Feedback
            </DialogTitle>
            <DialogDescription>
              Spotted a bug or have an idea? Let us know — this is a beta build, and your input shapes the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug report</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what happened or what you'd like to see…"
                rows={5}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Reported from <code className="text-foreground/80">{window.location.pathname}</code>
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting} className="bg-gradient-neon text-white">
              {submitting ? 'Sending…' : 'Send Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}