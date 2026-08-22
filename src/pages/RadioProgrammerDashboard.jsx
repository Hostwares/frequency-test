import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Radio, Music, Mail, Clock, Check, Search, 
  MessageSquare, Plus, User, History, X, Send, TrendingUp,
  FileSpreadsheet, Sparkles, Trophy, Download, Gauge, Heart,
  Inbox, ListMusic, Users
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import RadioProgrammerPerformanceChart from '@/components/radio/RadioProgrammerPerformanceChart';
import RadioProgrammerArtistSearch from '@/components/radio/RadioProgrammerArtistSearch';
import RotationStatusBadge, { ReviewPriorityBadge, ReviewStatusBadge } from '@/components/radio/RotationStatusBadge';
import ArtistDiscoveryFeed from '@/components/radio/ArtistDiscoveryFeed';
import EngagementTrendChart from '@/components/radio/EngagementTrendChart';
import ArtistComparisonView from '@/components/radio/ArtistComparisonView';
import RadioDownloadsCenter from '@/components/radio/RadioDownloadsCenter';
import SpinTracker from '@/components/radio/SpinTracker';
import RadioPlaylists from '@/components/radio/RadioPlaylists';
import FavoriteArtists from '@/components/radio/FavoriteArtists';
import SubmissionInbox from '@/components/radio/SubmissionInbox';
import SeatManager from '@/components/radio/SeatManager';

export default function RadioProgrammerDashboard() {
  const [activeTab, setActiveTab] = useState('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [queueSortBy, setQueueSortBy] = useState('priority');
  const [queueFilterStatus, setQueueFilterStatus] = useState('all');
  const [selectedQueueItems, setSelectedQueueItems] = useState([]);
  const [selectedHistoryItems, setSelectedHistoryItems] = useState([]);
  const [bulkActionRotation, setBulkActionRotation] = useState('');
  const [bulkActionReview, setBulkActionReview] = useState('');
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [discoveryTab, setDiscoveryTab] = useState('search');
  const [showComparison, setShowComparison] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: programmerProfile } = useQuery({
    queryKey: ['my-radio-profile', user?.id],
    queryFn: () => base44.entities.RadioProgrammer.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    select: d => d?.[0],
  });

  // Station owners manage multi-programmer seats; only show the Team tab if
  // the current user owns a verified station.
  const { data: ownedStation } = useQuery({
    queryKey: ['my-owned-station', user?.id],
    queryFn: async () => {
      const stations = await base44.entities.RadioStation.filter({ applicant_user_id: user.id });
      return (stations || []).find(s =>
        ['verified', 'verified_with_restrictions'].includes(s.verification_status)
      );
    },
    enabled: !!user?.id,
  });
  const isStationOwner = !!ownedStation;

  const { data: evaluationQueue = [] } = useQuery({
    queryKey: ['evaluation-queue', programmerProfile?.id],
    queryFn: () => base44.entities.RadioDownload.filter({ 
      programmer_id: programmerProfile?.id,
      activity_type: 'saved'
    }, '-created_date', 50),
    enabled: !!programmerProfile?.id,
  });

  const { data: rotationHistory = [] } = useQuery({
    queryKey: ['rotation-history', programmerProfile?.id],
    queryFn: () => base44.entities.RadioDownload.filter({ 
      programmer_id: programmerProfile?.id,
      activity_type: 'added_to_rotation'
    }, '-created_date', 200),
    enabled: !!programmerProfile?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['radio-messages', programmerProfile?.id],
    queryFn: () => base44.entities.RadioMessage.filter({ 
      recipient_user_id: user?.id,
      recipient_type: 'radio_programmer'
    }, '-created_date', 50),
    enabled: !!user?.id,
  });

  const { data: allArtists = [] } = useQuery({
    queryKey: ['all-artists'],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 100),
  });

  // Sort and filter evaluation queue
  const sortedAndFilteredQueue = useMemo(() => {
    let filtered = [...evaluationQueue];
    
    // Filter by status
    if (queueFilterStatus !== 'all') {
      filtered = filtered.filter(item => {
        if (queueFilterStatus === 'needs_review') return !item.review_status || item.review_status === 'pending';
        return item.review_status === queueFilterStatus;
      });
    }
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (queueSortBy === 'priority') {
      filtered.sort((a, b) => priorityOrder[a.review_priority || 'medium'] - priorityOrder[b.review_priority || 'medium']);
    } else if (queueSortBy === 'date') {
      filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
    
    return filtered;
  }, [evaluationQueue, queueSortBy, queueFilterStatus]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ artistId, subject, body }) => {
      const artist = allArtists.find(a => a.id === artistId);
      if (!artist) throw new Error('Artist not found');
      
      await base44.entities.RadioMessage.create({
        sender_user_id: user.id,
        recipient_user_id: artist.user_id,
        sender_type: 'radio_programmer',
        recipient_type: 'artist',
        radio_programmer_id: programmerProfile.id,
        artist_profile_id: artistId,
        subject,
        message: body,
        message_type: 'general',
        is_read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-messages'] });
      setShowMessageComposer(false);
      setSelectedArtist(null);
      setMessageSubject('');
      setMessageBody('');
    },
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (artist) => {
      await base44.entities.RadioDownload.create({
        programmer_id: programmerProfile.id,
        programmer_name: programmerProfile.station_name,
        artist_profile_id: artist.id,
        artist_name: artist.artist_name,
        song_id: 'pending',
        song_title: 'To be selected',
        activity_type: 'saved',
        radio_status: 'reviewing',
        review_priority: 'medium',
        internal_notes: '',
        is_private: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-queue'] });
    },
  });

  const updateQueueItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }) => {
      await base44.entities.RadioDownload.update(itemId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-queue'] });
    },
  });

  const removeFromQueueMutation = useMutation({
    mutationFn: async (itemId) => {
      await base44.entities.RadioDownload.delete(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-queue'] });
    },
  });

  const bulkUpdateRotationMutation = useMutation({
    mutationFn: async ({ itemIds, updates }) => {
      await Promise.all(itemIds.map(id => base44.entities.RadioDownload.update(id, updates)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotation-history'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-queue'] });
      setSelectedQueueItems([]);
      setSelectedHistoryItems([]);
      setBulkActionRotation('');
      setBulkActionReview('');
    },
  });

  const toggleQueueSelection = (itemId) => {
    setSelectedQueueItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleHistorySelection = (itemId) => {
    setSelectedHistoryItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAllQueue = () => {
    setSelectedQueueItems(sortedAndFilteredQueue.map(item => item.id));
  };

  const deselectAllQueue = () => {
    setSelectedQueueItems([]);
  };

  const selectAllHistory = () => {
    setSelectedHistoryItems(rotationHistory.map(item => item.id));
  };

  const deselectAllHistory = () => {
    setSelectedHistoryItems([]);
  };

  const handleBulkRotationUpdate = () => {
    if (!bulkActionRotation || selectedHistoryItems.length === 0) return;
    bulkUpdateRotationMutation.mutate({
      itemIds: selectedHistoryItems,
      updates: { radio_status: bulkActionRotation, activity_type: 'added_to_rotation' }
    });
  };

  const handleBulkReviewUpdate = () => {
    if (!bulkActionReview || selectedQueueItems.length === 0) return;
    bulkUpdateRotationMutation.mutate({
      itemIds: selectedQueueItems,
      updates: { review_status: bulkActionReview }
    });
  };

  const openMessageComposer = (artist) => {
    setSelectedArtist(artist);
    setMessageSubject(`Music Submission from ${programmerProfile.station_name}`);
    setMessageBody(`Hi ${artist.artist_name},\n\nI'm a radio programmer with ${programmerProfile.station_name} and I'm interested in your music. `);
    setShowMessageComposer(true);
  };

  const handleSendMessage = () => {
    if (!selectedArtist || !messageSubject || !messageBody) return;
    sendMessageMutation.mutate({
      artistId: selectedArtist.id,
      subject: messageSubject,
      body: messageBody,
    });
  };

  const exportToSheetsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('exportAirplayToSheets', {});
      return response.data;
    },
    onSuccess: (data) => {
      setExportStatus({ success: true, url: data.spreadsheetUrl, message: data.message });
      setTimeout(() => {
        setShowExportSheet(false);
        setExportStatus(null);
      }, 5000);
    },
  });

  const handleExportToSheets = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        await base44.auth.redirectToLogin();
        return;
      }
      await exportToSheetsMutation.mutateAsync();
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      if (errorMsg.toLowerCase().includes('connector') || errorMsg.toLowerCase().includes('not connected') || errorMsg.toLowerCase().includes('authorize')) {
        const url = await base44.connectors.connectAppUser('6a370c6b76208ed68fd00612');
        window.open(url, '_blank');
      } else {
        setExportStatus({ success: false, message: errorMsg || 'Export failed. Please try again.' });
      }
    }
  };

  if (!programmerProfile && user) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-3xl mx-auto">
        <GlassCard className="p-12 text-center">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-20 text-neon-cyan" />
          <h2 className="text-xl font-display font-bold mb-2">Radio Programmer Profile Required</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create your verified radio programmer profile to access the radio portal
          </p>
        </GlassCard>
      </div>
    );
  }

  if (!programmerProfile) return null;

  const pendingCount = evaluationQueue.length;
  const totalAdded = rotationHistory.length;
  const unreadMessages = messages.filter(m => !m.is_read).length;

  const currentRotation = rotationHistory.filter(t => 
    ['light_rotation', 'medium_rotation', 'heavy_rotation', 'featured'].includes(t.radio_status)
  );

  return (
    <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-cyan/10">
              <Radio className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">{programmerProfile.station_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  {programmerProfile.role.replace(/_/g, ' ')} • {programmerProfile.station_type.replace(/_/g, ' ')}
                </p>
                <NeonBadge color="cyan">Verified</NeonBadge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NeonBadge color="purple">{pendingCount} Pending</NeonBadge>
            <NeonBadge color="magenta">{currentRotation.length} Active</NeonBadge>
            {unreadMessages > 0 && (
              <NeonBadge color="blue">{unreadMessages} Messages</NeonBadge>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowExportSheet(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export to Sheets
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowComparison(true)}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Compare Artists
            </Button>
          </div>
        </div>

        {/* Export to Sheets Dialog */}
        {showExportSheet && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassCard className="w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-neon-cyan" />
                  Export Airplay Reports
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setShowExportSheet(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {exportStatus ? (
                <div className={`p-4 rounded-lg ${exportStatus.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-destructive/10 border border-destructive/30'}`}>
                  <p className={`text-sm ${exportStatus.success ? 'text-green-400' : 'text-destructive'}`}>
                    {exportStatus.message}
                  </p>
                  {exportStatus.success && exportStatus.url && (
                    <a 
                      href={exportStatus.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-neon-cyan underline mt-2 block"
                    >
                      Open Spreadsheet
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export your monthly airplay reports to Google Sheets to share with your station team.
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={handleExportToSheets}
                    disabled={exportToSheetsMutation.isPending}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    {exportToSheetsMutation.isPending ? 'Exporting...' : 'Export to Google Sheets'}
                  </Button>
                </>
              )}
            </GlassCard>
          </div>
        )}

        {/* Artist Comparison Dialog */}
        {showComparison && (
          <ArtistComparisonView onClose={() => setShowComparison(false)} />
        )}

        {/* Message Composer Dialog */}
        {showMessageComposer && selectedArtist && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassCard className="w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold">Message Artist</h3>
                <Button size="sm" variant="ghost" onClick={() => setShowMessageComposer(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mb-4 p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm font-semibold">{selectedArtist.artist_name}</p>
                <p className="text-xs text-muted-foreground">{selectedArtist.genre}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
                  <Input
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Enter subject..."
                  />
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Message</label>
                  <Textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Write your message..."
                    className="min-h-[150px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowMessageComposer(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!messageSubject || !messageBody}>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Engagement Trend Chart */}
        <div className="mb-6">
          <EngagementTrendChart rotationHistory={rotationHistory} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Clock, label: 'In Queue', value: pendingCount, color: 'text-neon-purple' },
            { icon: Check, label: 'In Rotation', value: currentRotation.length, color: 'text-neon-magenta' },
            { icon: History, label: 'Total Added', value: totalAdded, color: 'text-neon-cyan' },
            { icon: Mail, label: 'Messages', value: messages.length, color: 'text-neon-blue' },
          ].map(({ icon: Icon, label, value, color }) => (
            <GlassCard key={label} hover={false} className="p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="flex flex-wrap gap-1 bg-secondary/30 rounded-xl p-1">
            <TabsTrigger value="queue">
              <Clock className="w-4 h-4 mr-2" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="downloads">
              <Download className="w-4 h-4 mr-2" />
              Downloads
            </TabsTrigger>
            <TabsTrigger value="spins">
              <Gauge className="w-4 h-4 mr-2" />
              Spins
            </TabsTrigger>
            <TabsTrigger value="artists">
              <Search className="w-4 h-4 mr-2" />
              Artists
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="w-4 h-4 mr-2" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="playlists">
              <ListMusic className="w-4 h-4 mr-2" />
              Playlists
            </TabsTrigger>
            <TabsTrigger value="inbox">
              <Inbox className="w-4 h-4 mr-2" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="messages">
              <Mail className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
            {isStationOwner && (
              <TabsTrigger value="team">
                <Users className="w-4 h-4 mr-2" />
                Team
              </TabsTrigger>
            )}
          </TabsList>

          {/* Evaluation Queue */}
          <TabsContent value="queue" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-neon-purple" />
                Artists to Evaluate
              </h2>
              <div className="flex items-center gap-2">
                {sortedAndFilteredQueue.length > 0 && (
                  <>
                    <Button size="sm" variant="outline" onClick={selectAllQueue}>
                      Select All
                    </Button>
                    {selectedQueueItems.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={deselectAllQueue}>
                        Clear
                      </Button>
                    )}
                  </>
                )}
                <select
                  value={queueFilterStatus}
                  onChange={(e) => setQueueFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Needs Review</option>
                  <option value="shortlist">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={queueSortBy}
                  onChange={(e) => setQueueSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs"
                >
                  <option value="priority">Sort by Priority</option>
                  <option value="date">Sort by Date</option>
                </select>
              </div>
            </div>
            
            {selectedQueueItems.length > 0 && (
              <GlassCard className="p-3 bg-neon-purple/5 border-neon-purple/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neon-purple">
                    {selectedQueueItems.length} artist{selectedQueueItems.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkActionReview}
                      onChange={(e) => setBulkActionReview(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-secondary border border-border text-xs"
                    >
                      <option value="">Update Status...</option>
                      <option value="pending">Needs Review</option>
                      <option value="shortlist">Shortlist</option>
                      <option value="rejected">Reject</option>
                    </select>
                    <Button 
                      size="sm" 
                      onClick={handleBulkReviewUpdate}
                      disabled={!bulkActionReview}
                    >
                      Apply to Selected
                    </Button>
                  </div>
                </div>
              </GlassCard>
            )}
            
            {sortedAndFilteredQueue.length > 0 ? (
              <div className="space-y-3">
                {sortedAndFilteredQueue.map(item => (
                  <GlassCard key={item.id} className={`p-4 ${selectedQueueItems.includes(item.id) ? 'border-neon-purple/50 bg-neon-purple/5' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedQueueItems.includes(item.id)}
                          onChange={() => toggleQueueSelection(item.id)}
                          className="mt-1 w-4 h-4 rounded border-border bg-secondary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{item.artist_name}</h3>
                            <NeonBadge color="cyan">Artist</NeonBadge>
                            <RotationStatusBadge status={item.radio_status || 'reviewing'} />
                            <ReviewPriorityBadge priority={item.review_priority} />
                            {item.review_status && <ReviewStatusBadge status={item.review_status} />}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Added: {new Date(item.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          {item.internal_notes && (
                            <div className="mt-2 p-2 bg-secondary/30 rounded-lg">
                              <p className="text-xs text-muted-foreground">{item.internal_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <select
                          value={item.review_priority || 'medium'}
                          onChange={(e) => updateQueueItemMutation.mutate({
                            itemId: item.id,
                            updates: { review_priority: e.target.value }
                          })}
                          className="px-2 py-1 rounded-lg bg-secondary border border-border text-xs"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                        <select
                          value={item.review_status || 'pending'}
                          onChange={(e) => updateQueueItemMutation.mutate({
                            itemId: item.id,
                            updates: { review_status: e.target.value }
                          })}
                          className="px-2 py-1 rounded-lg bg-secondary border border-border text-xs"
                        >
                          <option value="pending">Needs Review</option>
                          <option value="shortlist">Shortlist</option>
                          <option value="rejected">Reject</option>
                        </select>
                        <Button size="sm" variant="outline" onClick={() => {
                          const artist = allArtists.find(a => a.id === item.artist_profile_id);
                          if (artist) openMessageComposer(artist);
                        }}>
                          <MessageSquare className="w-3 h-3 mr-1" /> Message
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeFromQueueMutation.mutate(item.id)}
                        >
                          <X className="w-3 h-3" /> Remove
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-purple" />
                <p className="text-sm text-muted-foreground">No artists in queue</p>
                <p className="text-xs text-muted-foreground mt-1">Browse emerging artists to build your queue</p>
              </GlassCard>
            )}
          </TabsContent>

          {/* Downloads Center */}
          <TabsContent value="downloads" className="space-y-4">
            <RadioDownloadsCenter programmerProfile={programmerProfile} />
          </TabsContent>

          {/* Spin Tracking */}
          <TabsContent value="spins" className="space-y-4">
            <SpinTracker programmerProfile={programmerProfile} />
          </TabsContent>

          {/* Favorite Artists */}
          <TabsContent value="favorites" className="space-y-4">
            <FavoriteArtists programmerProfile={programmerProfile} />
          </TabsContent>

          {/* Radio Playlists */}
          <TabsContent value="playlists" className="space-y-4">
            <RadioPlaylists programmerProfile={programmerProfile} />
          </TabsContent>

          {/* Submission Inbox */}
          <TabsContent value="inbox" className="space-y-4">
            <SubmissionInbox programmerProfile={programmerProfile} />
          </TabsContent>

          {/* Browse Artists */}
          <TabsContent value="artists" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TabsList className="bg-secondary/30 rounded-xl p-1">
                <TabsTrigger value="search" onClick={() => setDiscoveryTab('search')}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="discover" onClick={() => setDiscoveryTab('discover')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Discovery Feed
                </TabsTrigger>
              </TabsList>
            </div>
            
            {discoveryTab === 'search' ? (
              <RadioProgrammerArtistSearch 
                allArtists={allArtists}
                onAddToQueue={(artist) => addToQueueMutation.mutate(artist)}
                onMessageArtist={(artist) => openMessageComposer(artist)}
                existingQueueIds={evaluationQueue.map(item => item.artist_profile_id)}
              />
            ) : (
              <ArtistDiscoveryFeed 
                onAddToQueue={(artist) => addToQueueMutation.mutate(artist)}
                existingQueueIds={evaluationQueue.map(item => item.artist_profile_id)}
              />
            )}
          </TabsContent>

          {/* Rotation History */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-semibold text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-neon-cyan" />
                Broadcast Rotation History
              </h2>
              <div className="flex items-center gap-2">
                {rotationHistory.length > 0 && (
                  <>
                    <Button size="sm" variant="outline" onClick={selectAllHistory}>
                      Select All
                    </Button>
                    {selectedHistoryItems.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={deselectAllHistory}>
                        Clear
                      </Button>
                    )}
                  </>
                )}
                <NeonBadge color="cyan">{totalAdded} Total</NeonBadge>
              </div>
            </div>
            
            {selectedHistoryItems.length > 0 && (
              <GlassCard className="p-3 bg-neon-magenta/5 border-neon-magenta/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neon-magenta">
                    {selectedHistoryItems.length} track{selectedHistoryItems.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkActionRotation}
                      onChange={(e) => setBulkActionRotation(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-secondary border border-border text-xs"
                    >
                      <option value="">Update Rotation...</option>
                      <option value="light_rotation">Light Rotation</option>
                      <option value="medium_rotation">Medium Rotation</option>
                      <option value="heavy_rotation">Heavy Rotation</option>
                      <option value="featured">Featured</option>
                    </select>
                    <Button 
                      size="sm" 
                      onClick={handleBulkRotationUpdate}
                      disabled={!bulkActionRotation}
                    >
                      Apply to Selected
                    </Button>
                  </div>
                </div>
              </GlassCard>
            )}
            
            {/* Performance Chart */}
            <RadioProgrammerPerformanceChart rotationHistory={rotationHistory} />
            
            {/* Track List */}
            <div className="space-y-3">
              {rotationHistory.map(item => (
                <GlassCard key={item.id} className={`p-4 ${selectedHistoryItems.includes(item.id) ? 'border-neon-magenta/50 bg-neon-magenta/5' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedHistoryItems.includes(item.id)}
                        onChange={() => toggleHistorySelection(item.id)}
                        className="mt-1 w-4 h-4 rounded border-border bg-secondary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{item.song_title}</h3>
                          <NeonBadge color="cyan">{item.artist_name}</NeonBadge>
                          <RotationStatusBadge status={item.radio_status} showDescription />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Added: {new Date(item.created_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        const artist = allArtists.find(a => a.id === item.artist_profile_id);
                        if (artist) openMessageComposer(artist);
                      }}>
                        <MessageSquare className="w-3 h-3 mr-1" /> Message
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages" className="space-y-4">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-neon-blue" />
              Artist Messages
            </h2>
            {messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map(msg => (
                  <GlassCard key={msg.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">{msg.subject}</h3>
                          {!msg.is_read && <NeonBadge color="blue">New</NeonBadge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          From: {msg.sender_type === 'artist' ? 'Artist' : 'Programmer'}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(msg.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Mail className="w-3 h-3 mr-1" /> Reply
                      </Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-blue" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Messages from artists will appear here
                </p>
              </GlassCard>
            )}
          </TabsContent>

          {/* Team / Programmer Seat Management */}
          {isStationOwner && (
            <TabsContent value="team" className="space-y-4">
              <SeatManager />
            </TabsContent>
          )}
        </Tabs>

      </motion.div>
    </div>
  );
}