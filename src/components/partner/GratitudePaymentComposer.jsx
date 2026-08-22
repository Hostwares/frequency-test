import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Heart, Percent, DollarSign, Building2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

export default function GratitudePaymentComposer({ artistProfile, discoveryPartner, milestone }) {
  const [isOpen, setIsOpen] = useState(false);
  const [percentage, setPercentage] = useState(5);
  const [message, setMessage] = useState('');
  const [milestoneTrigger, setMilestoneTrigger] = useState(milestone || '20k_fans');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [usePercentage, setUsePercentage] = useState(true);
  const [customAmount, setCustomAmount] = useState('');

  // Auto-select partner if pre-provided
  useEffect(() => {
    if (discoveryPartner) {
      setSelectedPartnerId(discoveryPartner.id);
    } else if (artistProfile?.discovery_partner_id) {
      setSelectedPartnerId(artistProfile.discovery_partner_id);
    }
  }, [discoveryPartner, artistProfile]);

  const queryClient = useQueryClient();

  // Fetch all Discovery Partners for selection
  const { data: allPartners = [] } = useQuery({
    queryKey: ['discovery-partners-list'],
    queryFn: () => base44.entities.DiscoveryPartner.filter({ is_active: true }),
    enabled: isOpen && !discoveryPartner,
  });

  const sendPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendGratitudePayment', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Gratitude payment sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['gratitude-payments'] });
      queryClient.invalidateQueries({ queryKey: ['partner-gratitude-payments'] });
      setIsOpen(false);
      setPercentage(5);
      setMessage('');
      setCustomAmount('');
      setSelectedPartnerId('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send payment');
    },
  });

  useEffect(() => {
    if (discoveryPartner) {
      setSelectedPartnerId(discoveryPartner.id);
    } else if (artistProfile?.discovery_partner_id) {
      setSelectedPartnerId(artistProfile.discovery_partner_id);
    }
  }, [discoveryPartner, artistProfile]);

  const handleSubmit = () => {
    const partnerId = discoveryPartner?.id || selectedPartnerId || artistProfile?.discovery_partner_id;
    
    if (!partnerId) {
      toast.error('Please select a Discovery Partner');
      return;
    }

    if (!artistProfile) {
      toast.error('Artist profile not found');
      return;
    }

    const paymentData = {
      discovery_partner_id: partnerId,
      percentage: usePercentage ? percentage : 0,
      custom_amount: usePercentage ? 0 : parseFloat(customAmount) || 0,
      milestone_trigger: milestoneTrigger,
      message,
    };

    sendPaymentMutation.mutate(paymentData);
  };

  const milestoneLabels = {
    '20k_fans': '20,000 Fans (Breakout Artist)',
    '30k_fans': '30,000 Fans (Rising Star)',
    '40k_fans': '40,000 Fans (Superstar)',
    '50k_fans': '50,000 Fans (Icon)',
    '60k_fans': '60,000 Fans (Living Legend)',
    'custom': 'Custom Milestone',
  };

  const estimatedAmount = usePercentage
    ? artistProfile 
      ? ((artistProfile.monthly_support_total || 0) * percentage / 100).toFixed(2)
      : 0
    : customAmount || 0;

  const selectedPartnerData = allPartners.find(p => p.id === selectedPartnerId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
      <Button className="bg-gradient-neon hover:opacity-90">
        <Heart className="w-4 h-4 mr-2" />
        Send Gratitude Payment
      </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Thank Your Discovery Partner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Show appreciation to the Discovery Partner who helped you reach this milestone by sharing a portion of your royalties.
          </div>

          {/* Partner Selection (only if not pre-selected) */}
          {!discoveryPartner && allPartners.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Select Discovery Partner
              </Label>
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a partner..." />
                </SelectTrigger>
                <SelectContent>
                  {allPartners.map(partner => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name} {partner.is_verified && '✓'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!discoveryPartner && allPartners.length === 0 && (
            <GlassCard className="p-4 border-destructive/30 bg-destructive/5">
              <p className="text-sm text-destructive">
                No active Discovery Partners found. You need to work with a Discovery Partner before sending gratitude payments.
              </p>
            </GlassCard>
          )}

          {/* Milestone Selection */}
          <div className="space-y-2">
            <Label>Milestone Achieved</Label>
            <Select value={milestoneTrigger} onValueChange={setMilestoneTrigger}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(milestoneLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Type Selection */}
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={usePercentage ? "default" : "outline"}
                size="sm"
                onClick={() => setUsePercentage(true)}
                className="flex-1"
              >
                <Percent className="w-4 h-4 mr-2" />
                Percentage
              </Button>
              <Button
                type="button"
                variant={!usePercentage ? "default" : "outline"}
                size="sm"
                onClick={() => setUsePercentage(false)}
                className="flex-1"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Custom Amount
              </Button>
            </div>
          </div>

          {/* Percentage Selection */}
          {usePercentage && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Percentage of Monthly Royalties
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentage(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                  className="w-24"
                />
                <Progress value={percentage} className="flex-1" />
                <span className="text-lg font-bold text-neon-purple w-16 text-right">
                  {percentage}%
                </span>
              </div>
            </div>
          )}

          {/* Custom Amount Selection */}
          {!usePercentage && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Custom Amount (USD)
              </Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                className="w-full"
              />
            </div>
          )}

          {/* Estimated Amount Display */}
          <GlassCard className="p-4 bg-gradient-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-neon-cyan" />
                <span className="text-sm text-muted-foreground">Payment Amount:</span>
              </div>
              <span className="text-2xl font-bold text-neon-cyan">
                ${estimatedAmount}
              </span>
            </div>
            {usePercentage && (
              <p className="text-xs text-muted-foreground mt-2">
                {percentage}% of your monthly support (${artistProfile?.monthly_support_total || 0})
              </p>
            )}
            {!usePercentage && (
              <p className="text-xs text-muted-foreground mt-2">
                Custom amount - direct payment from your balance
              </p>
            )}
          </GlassCard>

          {/* Thank You Message */}
          <div className="space-y-2">
            <Label>Personal Message (Optional)</Label>
            <Textarea
              placeholder="Share your gratitude..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-24"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={sendPaymentMutation.isPending || estimatedAmount <= 0 || (!discoveryPartner && allPartners.length > 0 && !selectedPartnerId)}
            className="w-full bg-gradient-neon hover:opacity-90"
          >
            {sendPaymentMutation.isPending ? 'Processing...' : `Send $${estimatedAmount}`}
          </Button>

          {estimatedAmount <= 0 && (
            <p className="text-xs text-destructive text-center">
              Please enter a valid amount greater than $0
            </p>
          )}

          {!discoveryPartner && allPartners.length > 0 && !selectedPartnerId && (
            <p className="text-xs text-destructive text-center">
              Please select a Discovery Partner
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}