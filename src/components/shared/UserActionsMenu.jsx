import React, { useState } from 'react';
import { MoreHorizontal, Flag, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import ReportUserModal from '@/components/shared/ReportUserModal';
import UserBlockButton from '@/components/shared/UserBlockButton';

export default function UserActionsMenu({ targetUserId, targetUserName }) {
  const [reportOpen, setReportOpen] = useState(false);

  if (!targetUserId) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setReportOpen(true)} className="text-destructive gap-2">
            <Flag className="w-3.5 h-3.5" />
            Report User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-1 py-1">
            <UserBlockButton
              targetUserId={targetUserId}
              targetUserName={targetUserName}
              variant="ghost"
              size="sm"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportUserModal
        reportedUserId={targetUserId}
        reportedUserName={targetUserName}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}