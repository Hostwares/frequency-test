import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Flag, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

const REPORT_TYPES = [
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'spam', label: 'Spam or Misleading' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'scam_fraud', label: 'Scam or Fraud' },
  { value: 'copyright', label: 'Copyright Violation' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
];

export default function ReportUserModal({ reportedUserId, reportedUserName, open, onClose }) {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.UserReport.create(data),
    onSuccess: () => {
      toast.success('Report submitted. Our team will review it.');
      setReportType('');
      setDescription('');
      onClose();
      queryClient.invalidateQueries(['my-reports']);
    },
    onError: () => toast.error('Failed to submit report. Please try again.'),
  });

  const handleSubmit = () => {
    if (!reportType || !description.trim()) {
      toast.error('Please select a type and describe the issue.');
      return;
    }
    mutation.mutate({
      reporter_user_id: user.id,
      reported_user_id: reportedUserId,
      reported_user_name: reportedUserName || 'Unknown',
      report_type: reportType,
      description: description.trim(),
      context_url: window.location.pathname,
      status: 'pending',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Flag className="w-4 h-4 text-destructive" />
            </div>
            <DialogTitle>Report User</DialogTitle>
          </div>
          <DialogDescription>
            Report <span className="font-medium text-foreground">{reportedUserName || 'this user'}</span> for violating community guidelines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Reason</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Details</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">{description.length}/1000</p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              False reports may result in restrictions on your account. Only report genuine violations.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}