import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import VerificationBadge from '@/components/shared/VerificationBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, Clock, AlertCircle, XCircle, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

const verificationTypes = [
  {
    value: 'human_created',
    label: 'Human Created',
    description: 'Music created entirely by human artists without AI assistance',
    icon: '🎵',
  },
  {
    value: 'human_assisted',
    label: 'Human Assisted',
    description: 'Human-led creation with minor AI tools for enhancement',
    icon: '🤝',
  },
  {
    value: 'ai_assisted',
    label: 'AI Assisted',
    description: 'Collaborative creation between human and AI tools',
    icon: '🤖',
  },
  {
    value: 'ai_generated',
    label: 'AI Generated',
    description: 'Music created primarily by AI with human curation',
    icon: '✨',
  },
];

export default function ArtistVerificationRequest({ artistProfile, userId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState('human_created');
  const [artistStatement, setArtistStatement] = useState('');

  const { data: verificationRequest } = useQuery({
    queryKey: ['artist-verification', artistProfile?.id],
    queryFn: () => base44.entities.ArtistVerification.filter({ 
      artist_profile_id: artistProfile?.id,
      is_active: true 
    }, '-submission_date'),
    enabled: !!artistProfile?.id,
    select: (data) => data?.[0],
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.entities.ArtistVerification.create({
        artist_profile_id: artistProfile.id,
        artist_name: artistProfile.artist_name,
        user_id: userId,
        verification_type: data.verification_type,
        artist_statement: data.artist_statement,
        status: 'pending',
        submission_date: new Date().toISOString(),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-verification'] });
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      toast.success('Verification request submitted successfully!');
      setShowForm(false);
      setArtistStatement('');
    },
    onError: (error) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!artistStatement.trim()) {
      toast.error('Please provide an artist statement');
      return;
    }
    submitVerificationMutation.mutate({
      verification_type: selectedType,
      artist_statement: artistStatement,
    });
  };

  const getStatusDisplay = () => {
    if (!verificationRequest) return null;

    const statusIcons = {
      pending: <Clock className="w-5 h-5 text-yellow-500" />,
      under_review: <AlertCircle className="w-5 h-5 text-blue-500" />,
      verified: <CheckCircle className="w-5 h-5 text-green-500" />,
      rejected: <XCircle className="w-5 h-5 text-red-500" />,
    };

    return (
      <div className="flex items-center gap-3 mb-4">
        {statusIcons[verificationRequest.status]}
        <div>
          <p className="font-semibold text-sm">
            {verificationRequest.status === 'under_review' ? 'Under Review' : 
             verificationRequest.status.charAt(0).toUpperCase() + verificationRequest.status.slice(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            Submitted {new Date(verificationRequest.submission_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  };

  if (artistProfile?.is_verified) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Verified Artist</h2>
            <p className="text-xs text-muted-foreground">Your creative process has been verified</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <VerificationBadge 
            verificationType={artistProfile.verification_badge || 'human_created'} 
            isVerified={true} 
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="ml-auto"
          >
            <FileText className="w-3 h-3 mr-1" />
            Update Verification
          </Button>
        </div>

        {showForm && (
          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-sm">Submit New Verification Request</h3>
            <RadioGroup value={selectedType} onValueChange={setSelectedType}>
              {verificationTypes.map((type) => (
                <div
                  key={type.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/30 hover:border-border/50 transition-all cursor-pointer"
                  onClick={() => setSelectedType(type.value)}
                >
                  <RadioGroupItem value={type.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{type.icon}</span>
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div>
              <Label htmlFor="statement">Artist Statement</Label>
              <Textarea
                id="statement"
                placeholder="Describe your creative process and how you create music..."
                value={artistStatement}
                onChange={(e) => setArtistStatement(e.target.value)}
                className="h-24 mt-2"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={submitVerificationMutation.isPending}
                className="flex-1"
              >
                {submitVerificationMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    );
  }

  if (verificationRequest && verificationRequest.status !== 'rejected') {
    return (
      <GlassCard hover={false} className="p-6">
        {getStatusDisplay()}
        
        <div className="flex items-center gap-3 mb-4">
          <VerificationBadge 
            verificationType={verificationRequest.verification_type} 
            isVerified={false} 
          />
        </div>

        <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
          <h3 className="font-semibold text-sm mb-2">Artist Statement</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {verificationRequest.artist_statement || 'No statement provided'}
          </p>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <p className="text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Your verification request is being reviewed by our team. You'll be notified once the review is complete.
          </p>
        </div>
      </GlassCard>
    );
  }

  if (verificationRequest?.status === 'rejected') {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Verification Rejected</h2>
            <p className="text-xs text-muted-foreground">Please review and resubmit</p>
          </div>
        </div>

        {verificationRequest.verification_notes && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <h3 className="font-semibold text-sm mb-2">Reviewer Notes</h3>
            <p className="text-sm text-muted-foreground">{verificationRequest.verification_notes}</p>
          </div>
        )}

        <Button
          onClick={() => setShowForm(!showForm)}
          className="w-full"
        >
          <FileText className="w-3 h-3 mr-1" />
          Submit New Request
        </Button>

        {showForm && (
          <div className="mt-6 space-y-4">
            <RadioGroup value={selectedType} onValueChange={setSelectedType}>
              {verificationTypes.map((type) => (
                <div
                  key={type.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/30 hover:border-border/50 transition-all cursor-pointer"
                  onClick={() => setSelectedType(type.value)}
                >
                  <RadioGroupItem value={type.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{type.icon}</span>
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div>
              <Label htmlFor="statement">Artist Statement</Label>
              <Textarea
                id="statement"
                placeholder="Describe your creative process..."
                value={artistStatement}
                onChange={(e) => setArtistStatement(e.target.value)}
                className="h-24 mt-2"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={submitVerificationMutation.isPending}
                className="flex-1"
              >
                {submitVerificationMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
          <FileText className="w-6 h-6 text-neon-purple" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base">Artist Verification</h2>
          <p className="text-xs text-muted-foreground">Verify your creative process</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Submit your artist profile for verification to display your creative process badge. 
        This helps fans understand how you create music and builds trust in your artistry.
      </p>

      <Button
        onClick={() => setShowForm(!showForm)}
        className="w-full"
      >
        <FileText className="w-3 h-3 mr-1" />
        Submit Verification Request
      </Button>

      {showForm && (
        <div className="mt-6 space-y-4">
          <RadioGroup value={selectedType} onValueChange={setSelectedType}>
            {verificationTypes.map((type) => (
              <div
                key={type.value}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/30 hover:border-border/50 transition-all cursor-pointer"
                onClick={() => setSelectedType(type.value)}
              >
                <RadioGroupItem value={type.value} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{type.icon}</span>
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>

          <div>
            <Label htmlFor="statement">Artist Statement</Label>
            <Textarea
              id="statement"
              placeholder="Describe your creative process and how you create music..."
              value={artistStatement}
              onChange={(e) => setArtistStatement(e.target.value)}
              className="h-24 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Explain your approach to music creation and any tools you use
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitVerificationMutation.isPending}
              className="flex-1"
            >
              {submitVerificationMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}