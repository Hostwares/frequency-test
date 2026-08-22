import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Music, Film, Car, Guitar, Mic, Megaphone, Coffee,
  CheckCircle2, Loader2, Sparkles, TrendingUp, Target, DollarSign, Pencil, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  studio: Mic,
  video: Film,
  tour: Car,
  equipment: Guitar,
  production: Music,
  marketing: Megaphone,
  living: Coffee,
  other: Sparkles,
};

const CATEGORY_EMOJIS = {
  studio: '🎤',
  video: '🎬',
  tour: '🚐',
  equipment: '🎸',
  production: '🎹',
  marketing: '📢',
  living: '☕',
  other: '✨',
};

const STATUS_LABELS = {
  funding: 'Funding',
  funded: 'Funded',
  in_progress: 'In Progress',
  completed: 'Completed',
  started: 'Started',
};

const STATUS_COLORS = {
  funding: 'cyan',
  funded: 'turquoise',
  in_progress: 'purple',
  completed: 'turquoise',
  started: 'magenta',
};

function GoalCard({ goal, monthlySupport, onEdit, onDelete }) {
  const queryClient = useQueryClient();
  const Icon = CATEGORY_ICONS[goal.category] || Sparkles;
  const emoji = goal.icon || CATEGORY_EMOJIS[goal.category] || '✨';

  // Calculate funded amount: use manual current_amount or auto-calculate from monthly support
  const fundedAmount = goal.current_amount > 0 ? goal.current_amount : Math.min(monthlySupport, goal.target_amount);
  const progressPercent = goal.target_amount > 0 ? Math.min((fundedAmount / goal.target_amount) * 100, 100) : 0;

  // For quantitative goals, calculate units funded
  const unitsFunded = goal.unit_value && goal.unit_value > 0
    ? Math.floor(fundedAmount / goal.unit_value)
    : 0;

  const updateStatus = useMutation({
    mutationFn: (status) => base44.entities.SupportGoal.update(goal.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-goals'] });
      toast.success('Status updated');
    },
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-secondary/20 rounded-xl border border-border/30 p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <p className="text-sm font-semibold">{goal.title}</p>
            {goal.description && (
              <p className="text-[10px] text-muted-foreground">{goal.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(goal)} className="p-1.5 rounded-lg hover:bg-secondary/50">
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
          <button onClick={() => onDelete(goal)} className="p-1.5 rounded-lg hover:bg-secondary/50">
            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Progress display based on type */}
      {goal.display_type === 'quantitative' && (
        <div className="mb-2">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-lg font-bold text-neon-cyan">{unitsFunded}</span>
            <span className="text-xs text-muted-foreground">{goal.unit_label || 'units'} funded</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            ${fundedAmount.toFixed(0)} / ${goal.target_amount.toFixed(0)} (${goal.unit_value}/{goal.unit_label?.slice(0, -1) || 'unit'})
          </p>
        </div>
      )}

      {goal.display_type === 'percentage' && (
        <div className="mb-2">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-lg font-bold text-neon-purple">{Math.round(progressPercent)}%</span>
            <span className="text-xs text-muted-foreground">funded</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            ${fundedAmount.toFixed(0)} / ${goal.target_amount.toFixed(0)}
          </p>
        </div>
      )}

      {goal.display_type === 'binary' && (
        <div className="mb-2">
          {progressPercent >= 100 || goal.status === 'funded' || goal.status === 'completed' ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-neon-turquoise" />
              <span className="text-sm font-bold text-neon-turquoise">Covered</span>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}% covered</span>
                <span className="text-[10px] text-muted-foreground">${fundedAmount.toFixed(0)} / ${goal.target_amount.toFixed(0)}</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
        </div>
      )}

      {goal.display_type === 'milestone' && (
        <div className="mb-2">
          <NeonBadge color={STATUS_COLORS[goal.status] || 'cyan'}>
            {STATUS_LABELS[goal.status] || goal.status}
          </NeonBadge>
        </div>
      )}

      {/* Status selector */}
      <div className="flex items-center gap-1.5 mt-2">
        <Select value={goal.status} onValueChange={(v) => updateStatus.mutate(v)}>
          <SelectTrigger className="h-7 text-[10px] w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
}

function GoalEditor({ open, onClose, goal, artistProfileId, month }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    category: goal?.category || 'studio',
    display_type: goal?.display_type || 'percentage',
    unit_label: goal?.unit_label || '',
    unit_value: goal?.unit_value || '',
    target_amount: goal?.target_amount || '',
    current_amount: goal?.current_amount || 0,
    status: goal?.status || 'funding',
    icon: goal?.icon || '',
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        artist_profile_id: artistProfileId,
        month,
        target_amount: parseFloat(form.target_amount) || 0,
        unit_value: parseFloat(form.unit_value) || 0,
        current_amount: parseFloat(form.current_amount) || 0,
        icon: form.icon || CATEGORY_EMOJIS[form.category] || '✨',
      };
      if (goal?.id) {
        return base44.entities.SupportGoal.update(goal.id, payload);
      }
      return base44.entities.SupportGoal.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-goals'] });
      toast.success(goal?.id ? 'Goal updated' : 'Goal created');
      onClose();
    },
    onError: (e) => toast.error('Failed to save goal'),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{goal?.id ? 'Edit Goal' : 'New Impact Goal'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Studio Time" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Tracking vocals for new EP" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_EMOJIS).map(([val, emoji]) => (
                    <SelectItem key={val} value={val}>{emoji} {val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Type</label>
              <Select value={form.display_type} onValueChange={v => setForm({...form, display_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantitative">Quantitative (units)</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="binary">Binary (Covered)</SelectItem>
                  <SelectItem value="milestone">Milestone (status)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target Amount ($)</label>
              <Input type="number" value={form.target_amount} onChange={e => setForm({...form, target_amount: e.target.value})} placeholder="500" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Emoji (optional)</label>
              <Input value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} placeholder="🎤" maxLength={2} />
            </div>
          </div>
          {form.display_type === 'quantitative' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unit Label</label>
                <Input value={form.unit_label} onChange={e => setForm({...form, unit_label: e.target.value})} placeholder="hours" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">$ per unit</label>
                <Input type="number" value={form.unit_value} onChange={e => setForm({...form, unit_value: e.target.value})} placeholder="50" />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Current Amount ($)</label>
            <Input type="number" value={form.current_amount} onChange={e => setForm({...form, current_amount: e.target.value})} placeholder="0" />
            <p className="text-[10px] text-muted-foreground mt-1">Leave 0 to auto-calculate from monthly support</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.target_amount}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SupportImpactDashboard({ artistProfileId, supporters = [] }) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const queryClient = useQueryClient();

  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthlySupport = supporters.reduce((sum, s) => sum + (s.amount || 0), 0);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['support-goals', artistProfileId, currentMonth],
    queryFn: () => base44.entities.SupportGoal.filter({
      artist_profile_id: artistProfileId,
      month: currentMonth,
    }, 'sort_order'),
    enabled: !!artistProfileId,
  });

  const deleteGoal = useMutation({
    mutationFn: (id) => base44.entities.SupportGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-goals'] });
      toast.success('Goal removed');
    },
  });

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowEditor(true);
  };

  const handleDelete = (goal) => {
    deleteGoal.mutate(goal.id);
  };

  const handleAdd = () => {
    setEditingGoal(null);
    setShowEditor(true);
  };

  const handleClose = () => {
    setShowEditor(false);
    setEditingGoal(null);
  };

  // Calculate impact breakdown — what fan funds actually achieved
  const impactBreakdown = goals.map(g => {
    const fundedAmount = g.current_amount > 0 ? g.current_amount : Math.min(monthlySupport, g.target_amount || 0);
    const unitsFunded = g.unit_value && g.unit_value > 0 ? Math.floor(fundedAmount / g.unit_value) : 0;
    const isAchieved = g.status === 'completed' || g.status === 'funded' || (g.target_amount > 0 && fundedAmount >= g.target_amount);
    const isInProgress = g.status === 'in_progress' || g.status === 'started';
    return {
      ...g,
      fundedAmount,
      unitsFunded,
      isAchieved,
      isInProgress,
    };
  });

  // Aggregate by category for the breakdown
  const categoryImpact = {};
  impactBreakdown.forEach(g => {
    if (!categoryImpact[g.category]) {
      categoryImpact[g.category] = {
        category: g.category,
        emoji: g.icon || CATEGORY_EMOJIS[g.category] || '✨',
        label: g.category.charAt(0).toUpperCase() + g.category.slice(1),
        totalUnits: 0,
        totalFunded: 0,
        goalsAchieved: 0,
        goalsInProgress: 0,
        unitLabel: g.unit_label || '',
        items: [],
      };
    }
    const cat = categoryImpact[g.category];
    cat.totalFunded += g.fundedAmount;
    if (g.unitsFunded > 0) {
      cat.totalUnits += g.unitsFunded;
      if (g.unit_label && !cat.unitLabel) cat.unitLabel = g.unit_label;
    }
    if (g.isAchieved) cat.goalsAchieved += 1;
    if (g.isInProgress) cat.goalsInProgress += 1;
    cat.items.push(g);
  });

  const totalFundedAcrossGoals = impactBreakdown.reduce((sum, g) => sum + g.fundedAmount, 0);
  const totalUnitsFunded = impactBreakdown.reduce((sum, g) => sum + (g.unitsFunded || 0), 0);
  const achievedCount = impactBreakdown.filter(g => g.isAchieved).length;
  const inProgressCount = impactBreakdown.filter(g => g.isInProgress).length;

  return (
    <GlassCard hover={false} className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/10 border border-neon-purple/20">
            <Sparkles className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base">Support Impact Dashboard™</h2>
            <p className="text-xs text-muted-foreground">What your fans made possible this month</p>
          </div>
        </div>
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Goal
        </Button>
      </div>

      {/* Monthly support summary */}
      <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-gradient-to-r from-neon-purple/10 to-neon-cyan/5 border border-neon-purple/15">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-neon-cyan" />
          <div>
            <p className="text-2xl font-bold text-neon-cyan">${monthlySupport.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">raised this month</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border/30" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-neon-purple" />
          <div>
            <p className="text-2xl font-bold text-neon-purple">{supporters.length}</p>
            <p className="text-[10px] text-muted-foreground">supporters contributing</p>
          </div>
        </div>
        {goals.length > 0 && (
          <>
            <div className="h-8 w-px bg-border/30" />
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neon-turquoise" />
              <div>
                <p className="text-2xl font-bold text-neon-turquoise">{achievedCount}/{goals.length}</p>
                <p className="text-[10px] text-muted-foreground">goals achieved</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Impact Breakdown — what fan funds actually achieved */}
      {goals.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-neon-turquoise" />
            <h3 className="text-sm font-display font-semibold">What Your Fans Made Possible</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(categoryImpact).map(cat => (
              <div key={cat.category} className="p-4 rounded-xl bg-gradient-to-br from-neon-turquoise/8 to-neon-cyan/4 border border-neon-turquoise/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-sm font-semibold">{cat.label}</span>
                  {cat.goalsAchieved > 0 && (
                    <NeonBadge color="turquoise" className="ml-auto">{cat.goalsAchieved} done</NeonBadge>
                  )}
                </div>
                {cat.totalUnits > 0 && (
                  <div className="mb-1">
                    <span className="text-xl font-bold text-neon-turquoise">{cat.totalUnits}</span>
                    <span className="text-xs text-muted-foreground ml-1">{cat.unitLabel || 'units'} funded</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  ${cat.totalFunded.toFixed(0)} total funded
                  {cat.goalsInProgress > 0 && ` · ${cat.goalsInProgress} in progress`}
                </p>
              </div>
            ))}
          </div>
          {/* Aggregate impact footer */}
          <div className="mt-3 flex items-center gap-4 flex-wrap p-3 rounded-lg bg-secondary/20 border border-border/30">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-xs text-muted-foreground">Total deployed:</span>
              <span className="text-sm font-bold text-neon-cyan">${totalFundedAcrossGoals.toFixed(0)}</span>
            </div>
            {totalUnitsFunded > 0 && (
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-neon-purple" />
                <span className="text-xs text-muted-foreground">Tangible units:</span>
                <span className="text-sm font-bold text-neon-purple">{totalUnitsFunded}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-neon-turquoise" />
              <span className="text-xs text-muted-foreground">Achieved:</span>
              <span className="text-sm font-bold text-neon-turquoise">{achievedCount}/{goals.length}</span>
            </div>
            {inProgressCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-neon-magenta" />
                <span className="text-xs text-muted-foreground">In progress:</span>
                <span className="text-sm font-bold text-neon-magenta">{inProgressCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goals grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : goals.length > 0 ? (
        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                monthlySupport={monthlySupport}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </AnimatePresence>
      ) : (
        <div className="text-center py-10 border border-dashed border-border/30 rounded-xl">
          <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No impact goals yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Show your fans what their support accomplishes — studio time, music videos, tour costs, and more.
          </p>
          <Button size="sm" variant="outline" onClick={handleAdd} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Your First Goal
          </Button>
        </div>
      )}

      {/* Editor dialog */}
      {showEditor && (
        <GoalEditor
          open={showEditor}
          onClose={handleClose}
          goal={editingGoal}
          artistProfileId={artistProfileId}
          month={currentMonth}
        />
      )}
    </GlassCard>
  );
}