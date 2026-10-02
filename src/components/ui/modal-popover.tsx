"use client";

import { useEffect, useState, type ReactNode } from "react";

export function ModalPopover({
  trigger,
  title,
  children,
  dialogClassName = "",
  triggerAriaLabel,
}: {
  trigger: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  dialogClassName?: string;
  triggerAriaLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll on mobile while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={triggerAriaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="cursor-pointer select-none"
      >
        {trigger}
      </div>

      {/* Modal Dialog & Click-outside Backdrop */}
      {isOpen && (
        <>
          {/* Backdrop - Click outside closes modal immediately */}
          <div
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className={`fixed inset-x-3 top-16 z-50 max-h-[calc(100vh-140px)] overflow-y-auto rounded-r28 border border-stroke bg-surface p-5 shadow-nav sm:absolute sm:inset-auto sm:right-0 sm:top-14 sm:w-[410px] sm:max-h-[85vh] ${dialogClassName}`}
          >
            {/* Header with Title and Close Button */}
            <div className="mb-4 flex items-center justify-between gap-3">
              {title ? (
                <div className="text-xs font-black uppercase tracking-[.18em] text-pink">
                  {title}
                </div>
              ) : (
                <div />
              )}
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setIsOpen(false)}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-bg text-sm font-bold text-secondary transition hover:bg-stroke/60 hover:text-ink active:scale-press"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div>{children}</div>
          </div>
        </>
      )}
    </div>
  );
}
