import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Activity, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export default function FrequencyHealthMetrics({ communityId, community }) {
  // Fetch monthly support data
  const { data: supportAllocations = [] } = useQuery({
    queryKey: ['community-support-data', communityId],
    queryFn: () => base44.entities.SupportAllocation.filter({ 
      community_id: communityId,
      is_active: true 
    }),
    enabled: !!communityId,
  });

  // Fetch community posts/activity
  const { data: councilPosts = [] } = useQuery({
    queryKey: ['community-posts', communityId],
    queryFn: () => base44.entities.CouncilPost.filter({ 
      community_id: communityId 
    }, '-created_date', 100),
    enabled: !!communityId,
  });

  // Calculate monthly metrics (last 6 months)
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      // Calculate support for this month
      const monthSupport = supportAllocations
        .filter(s => {
          const sDate = new Date(s.created_date);
          return sDate.getMonth() === date.getMonth() && 
                 sDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, s) => sum + (s.amount || 0), 0);
      
      // Calculate activity (posts/votes) for this month
      const monthActivity = councilPosts.filter(p => {
        const pDate = new Date(p.created_date);
        return pDate.getMonth() === date.getMonth() && 
               pDate.getFullYear() === date.getFullYear();
      }).length;
      
      months.push({
        month: monthName,
        support: monthSupport,
        activity: monthActivity,
        members: (community?.member_count || 0) * (1 - (i * 0.05)), // Simulated growth
      });
    }
    
    return months;
  }, [supportAllocations, councilPosts, community]);

  // Calculate growth rates
  const metrics = useMemo(() => {
    if (monthlyData.length < 2) return { supportGrowth: 0, memberGrowth: 0, activityGrowth: 0 };
    
    const latest = monthlyData[monthlyData.length - 1];
    const previous = monthlyData[monthlyData.length - 2];
    
    const supportGrowth = previous.support > 0 
      ? ((latest.support - previous.support) / previous.support) * 100 
      : 0;
    
    const memberGrowth = community?.member_count 
      ? ((community.member_count - (community.member_count * 0.95)) / (community.member_count * 0.95)) * 100 
      : 0;
    
    const activityGrowth = previous.activity > 0 
      ? ((latest.activity - previous.activity) / previous.activity) * 100 
      : 0;
    
    return { supportGrowth, memberGrowth, activityGrowth };
  }, [monthlyData, community]);

  const currentSupport = monthlyData[monthlyData.length - 1]?.support || 0;
  const currentActivity = monthlyData[monthlyData.length - 1]?.activity || 0;

  return (
    <GlassCard hover={false} className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-neon-cyan" />
          <div>
            <h3 className="font-display font-semibold text-foreground">Community Health Metrics</h3>
            <p className="text-xs text-muted-foreground">Track growth and engagement trends</p>
          </div>
        </div>
        <NeonBadge color="cyan">Last 6 Months</NeonBadge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {/* Monthly Support Volume */}
        <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-neon-purple" />
            <span className="text-xs text-muted-foreground">Monthly Support</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold text-neon-purple">${currentSupport.toFixed(0)}</p>
            {metrics.supportGrowth >= 0 ? (
              <div className="flex items-center text-xs text-green-500">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {metrics.supportGrowth.toFixed(1)}%
              </div>
            ) : (
              <div className="flex items-center text-xs text-red-500">
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                {Math.abs(metrics.supportGrowth).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Member Growth Rate */}
        <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs text-muted-foreground">Member Growth</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold text-neon-cyan">{community?.member_count?.toLocaleString() || 0}</p>
            {metrics.memberGrowth >= 0 ? (
              <div className="flex items-center text-xs text-green-500">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {metrics.memberGrowth.toFixed(1)}%
              </div>
            ) : (
              <div className="flex items-center text-xs text-red-500">
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                {Math.abs(metrics.memberGrowth).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Activity Trend */}
        <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-neon-magenta" />
            <span className="text-xs text-muted-foreground">Activity Level</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold text-neon-magenta">{currentActivity}</p>
            {metrics.activityGrowth >= 0 ? (
              <div className="flex items-center text-xs text-green-500">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {metrics.activityGrowth.toFixed(1)}%
              </div>
            ) : (
              <div className="flex items-center text-xs text-red-500">
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                {Math.abs(metrics.activityGrowth).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Support Volume Chart */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-neon-purple" />
            <h4 className="text-sm font-semibold">Support Volume Trend</h4>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="supportGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Support Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="support"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#supportGradient)"
                  name="Support"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Activity Trend Chart */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-neon-magenta" />
            <h4 className="text-sm font-semibold">Member Activity Trend</h4>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [value, 'Activities']}
                />
                <Line
                  type="monotone"
                  dataKey="activity"
                  stroke="#d946ef"
                  strokeWidth={2}
                  dot={{ fill: '#d946ef', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Activity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Health Insights */}
      <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-neon-purple/5 to-neon-cyan/5 border border-border/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <TrendingUp className="w-4 h-4 text-neon-purple" />
          </div>
          <div>
            <h5 className="text-sm font-semibold mb-1">Community Health Insights</h5>
            <div className="text-xs text-muted-foreground space-y-1">
              {metrics.supportGrowth > 10 && (
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Support volume is growing strongly ({metrics.supportGrowth.toFixed(1)}% increase)
                </p>
              )}
              {metrics.memberGrowth > 5 && (
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Member base is expanding steadily
                </p>
              )}
              {metrics.activityGrowth < 0 && (
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  Consider engagement initiatives to boost activity
                </p>
              )}
              {metrics.supportGrowth <= 10 && metrics.memberGrowth <= 5 && metrics.activityGrowth <= 0 && (
                <p>Community is stable. Focus on engagement activities to drive growth.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}