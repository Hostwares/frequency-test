import React from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NeonBadge from '@/components/shared/NeonBadge';

const RANK_LABELS = { 1: '1st Choice', 2: '2nd Choice', 3: '3rd Choice' };
const RANK_COLORS = { 1: 'magenta', 2: 'purple', 3: 'blue' };

export default function RankedChoiceSelector({ nominees, selections, onSelect, onClear }) {
  const usedNomineeIds = Object.values(selections).filter(Boolean);

  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map(rank => {
        const selectedId = selections[rank];
        const availableNominees = nominees.filter(
          n => !usedNomineeIds.includes(n.id) || n.id === selectedId
        );

        return (
          <div key={rank} className="flex items-center gap-2">
            <div className="w-20 flex-shrink-0">
              <NeonBadge color={RANK_COLORS[rank]}>{RANK_LABELS[rank]}</NeonBadge>
            </div>
            <Select
              value={selectedId || ''}
              onValueChange={(val) => onSelect(rank, val)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select nominee..." />
              </SelectTrigger>
              <SelectContent>
                {availableNominees.map(n => (
                  <SelectItem key={n.id} value={n.id}>{n.nominee_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedId && (
              <>
                <Link
                  to={`/nominee/${selectedId}`}
                  className="p-1 text-neon-cyan hover:text-neon-cyan/80 flex-shrink-0"
                  title="View nominee profile"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => onClear(rank)}
                  className="p-1 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground">
        Select your 1st, 2nd, and 3rd choices. 2nd and 3rd are optional but recommended.
      </p>
    </div>
  );
}