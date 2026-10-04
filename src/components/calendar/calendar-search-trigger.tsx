"use client";

import { useState } from "react";
import { SearchNormal1 } from "@/components/ui/iconsax";
import {
  CalendarCommandSearch,
  type SearchableShoot,
} from "./calendar-command-search";

export function CalendarSearchTrigger({
  shoots,
  projectMap,
  timezone,
  className = "",
}: {
  shoots: SearchableShoot[];
  projectMap?: Record<string, string>;
  timezone: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Search calendar (⌘K)"
        title="Tìm kiếm buổi quay (⌘K)"
        onClick={() => setOpen(true)}
        className={`grid size-11 place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition-all duration-fast hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press ${className}`}
      >
        <SearchNormal1 size={18} variant="Linear" />
      </button>

      <CalendarCommandSearch
        shoots={shoots}
        projectMap={projectMap}
        timezone={timezone}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
