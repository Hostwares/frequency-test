import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayoutCalendar({ artistProfileId, userId }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Fetch payout history
  const { data: payouts = [] } = useQuery({
    queryKey: ['artist-payouts', artistProfileId],
    queryFn: () => base44.entities.ArtistPayout.filter({ 
      artist_profile_id: artistProfileId 
    }, '-processed_date'),
    enabled: !!artistProfileId,
  });

  // Fetch pending orders for threshold calculation
  const { data: orders = [] } = useQuery({
    queryKey: ['artist-orders', artistProfileId],
    queryFn: () => base44.entities.Order.filter({ 
      artist_profile_id: artistProfileId,
      payment_status: 'paid'
    }, '-created_date'),
    enabled: !!artistProfileId,
  });

  // Calculate current pending balance
  const pendingBalance = orders.reduce((sum, order) => {
    const orderDate = new Date(order.created_date);
    const now = new Date();
    // Only count orders from current month
    if (orderDate.getMonth() === now.getMonth() && 
        orderDate.getFullYear() === now.getFullYear()) {
      return sum + (order.artist_earnings || 0);
    }
    return sum;
  }, 0);

  const threshold = 50;
  const isAboveThreshold = pendingBalance >= threshold;
  const progressToThreshold = Math.min((pendingBalance / threshold) * 100, 100);

  // Get payout dates (typically monthly)
  const payoutDates = useMemo(() => {
    const dates = [];
    const now = new Date();
    const year = now.getFullYear();
    
    // Generate payout dates for current year (typically 15th or end of month)
    for (let month = 0; month < 12; month++) {
      // Assume payouts happen on the 15th of each month
      const payoutDate = new Date(year, month, 15);
      dates.push({
        date: payoutDate,
        day: 15,
        month: month,
        year: year,
        isPast: payoutDate < now,
        isToday: payoutDate.toDateString() === now.toDateString(),
      });
    }
    
    return dates;
  }, []);

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: totalDays - i, isOtherMonth: true, date: new Date(year, month - 1, totalDays - i) });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const isPayoutDay = payoutDates.some(p => 
        p.date.toDateString() === date.toDateString()
      );
      const isToday = date.toDateString() === new Date().toDateString();
      
      days.push({ 
        day: i, 
        isOtherMonth: false, 
        isPayoutDay,
        isToday,
        date 
      });
    }
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isOtherMonth: true, date: new Date(year, month + 1, i) });
    }
    
    return days;
  }, [currentMonth, payoutDates]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Find payouts for selected date
  const selectedPayouts = selectedDate 
    ? payouts.filter(p => {
        const pDate = p.processed_date ? new Date(p.processed_date) : null;
        return pDate && pDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-neon-purple" />
          <h3 className="font-display font-semibold text-foreground">Payout Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 text-xs">
            Today
          </Button>
        </div>
      </div>

      {/* Threshold Status */}
      <GlassCard className="p-4 border-neon-purple/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-neon-purple" />
            <span className="text-sm font-semibold">Current Month Progress</span>
          </div>
          {isAboveThreshold ? (
            <NeonBadge color="cyan">Ready for Payout</NeonBadge>
          ) : (
            <NeonBadge color="magenta">${(threshold - pendingBalance).toFixed(2)} to go</NeonBadge>
          )}
        </div>
        
        <div className="mb-2">
          <div className="flex items-end justify-between mb-1">
            <span className="text-2xl font-bold text-neon-purple">${pendingBalance.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">/ ${threshold} threshold</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToThreshold}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full ${isAboveThreshold ? 'bg-gradient-to-r from-neon-cyan to-neon-green' : 'bg-gradient-to-r from-neon-purple to-neon-magenta'}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          {isAboveThreshold ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>You've reached the $50 threshold! Next payout: {payoutDates.find(p => p.date > new Date())?.date.toLocaleDateString() || 'Soon'}</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 text-neon-magenta" />
              <span>Keep earning! Automatic payout at $50</span>
            </>
          )}
        </div>
      </GlassCard>

      {/* Calendar Grid */}
      <GlassCard className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayInfo, idx) => {
            const isPayoutDay = dayInfo.isPayoutDay;
            const isToday = dayInfo.isToday;
            const isSelected = selectedDate && dayInfo.date.toDateString() === selectedDate.toDateString();
            
            return (
              <button
                key={idx}
                onClick={() => !dayInfo.isOtherMonth && setSelectedDate(dayInfo.date)}
                disabled={dayInfo.isOtherMonth}
                className={`
                  relative p-2 h-14 rounded-lg border transition-all
                  ${dayInfo.isOtherMonth 
                    ? 'bg-transparent border-transparent text-muted-foreground/30 cursor-default' 
                    : 'bg-secondary/20 border-border/30 hover:border-neon-purple/50 cursor-pointer'
                  }
                  ${isToday ? 'ring-2 ring-neon-purple ring-offset-2 ring-offset-background' : ''}
                  ${isSelected ? 'bg-neon-purple/10 border-neon-purple/50' : ''}
                  ${isPayoutDay && !dayInfo.isOtherMonth ? 'border-neon-cyan/50 bg-neon-cyan/5' : ''}
                `}
              >
                <span className={`text-sm font-medium ${isToday ? 'text-neon-purple' : ''}`}>
                  {dayInfo.day}
                </span>
                
                {isPayoutDay && !dayInfo.isOtherMonth && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-neon-cyan" />
            <span>Payout Date</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full ring-2 ring-neon-purple" />
            <span>Today</span>
          </div>
        </div>
      </GlassCard>

      {/* Selected Date Details */}
      {selectedDate && selectedPayouts.length > 0 && (
        <GlassCard className="p-4 border-neon-cyan/30">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-neon-cyan" />
            <h4 className="text-sm font-semibold">
              Payouts on {selectedDate.toLocaleDateString()}
            </h4>
          </div>
          <div className="space-y-2">
            {selectedPayouts.map(payout => (
              <div key={payout.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div>
                  <p className="text-sm font-medium">${payout.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{payout.payout_type} payout</p>
                </div>
                <NeonBadge color="cyan">{payout.status}</NeonBadge>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Upcoming Payout Info */}
      <GlassCard className="p-4 bg-gradient-to-r from-neon-purple/5 to-neon-cyan/5 border-border/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <AlertCircle className="w-4 h-4 text-neon-purple" />
          </div>
          <div>
            <h5 className="text-sm font-semibold mb-1">Payout Schedule</h5>
            <p className="text-xs text-muted-foreground">
              Automatic payouts are processed on the 15th of each month once you reach the $50 threshold. 
              Manual instant payouts are available anytime you exceed $50.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}