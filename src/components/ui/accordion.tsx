"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ArrowDown2 } from "@/components/ui/iconsax";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";

interface AccordionContextType {
  value: string[];
  onToggle: (itemValue: string) => void;
  isMultiple: boolean;
}

const AccordionContext = React.createContext<AccordionContextType | null>(null);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  return context;
}

const AccordionItemContext = React.createContext<{ isOpen: boolean; value: string }>({
  isOpen: false,
  value: "",
});

function useAccordionItem() {
  return React.useContext(AccordionItemContext);
}

export interface AccordionProps {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: any) => void;
  children: React.ReactNode;
  className?: string;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = "multiple",
      value: controlledValue,
      defaultValue = [],
      onValueChange,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isMultiple = type === "multiple";
    const toArray = React.useCallback(
      (val: string | string[] | undefined): string[] => {
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
      },
      []
    );

    const [uncontrolledValue, setUncontrolledValue] = React.useState<string[]>(
      toArray(defaultValue)
    );

    const isControlled = controlledValue !== undefined;
    const currentValues = isControlled ? toArray(controlledValue) : uncontrolledValue;

    const handleToggle = React.useCallback(
      (itemValue: string) => {
        let next: string[];
        if (isMultiple) {
          next = currentValues.includes(itemValue)
            ? currentValues.filter((v) => v !== itemValue)
            : [...currentValues, itemValue];
        } else {
          next = currentValues.includes(itemValue) ? [] : [itemValue];
        }

        if (!isControlled) {
          setUncontrolledValue(next);
        }

        if (onValueChange) {
          onValueChange(isMultiple ? next : next[0] ?? "");
        }
      },
      [currentValues, isControlled, isMultiple, onValueChange]
    );

    const contextValue = React.useMemo<AccordionContextType>(
      () => ({
        value: currentValues,
        onToggle: handleToggle,
        isMultiple,
      }),
      [currentValues, handleToggle, isMultiple]
    );

    return (
      <AccordionContext.Provider value={contextValue}>
        <div ref={ref} className={cn("space-y-4", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children, ...props }, ref) => {
    const accordion = useAccordion();
    const isOpen = accordion?.value.includes(value) ?? false;

    return (
      <AccordionItemContext.Provider value={{ isOpen, value }}>
        <div
          ref={ref}
          data-state={isOpen ? "open" : "closed"}
          className={cn(
            "rounded-r24 sm:rounded-r28 border border-stroke/80 bg-surface text-ink shadow-soft transition-colors",
            isOpen && "border-stroke shadow-md",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

export interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  chevronClassName?: string;
  hideChevron?: boolean;
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, chevronClassName, hideChevron = false, onClick, ...props }, ref) => {
    const { isOpen, value } = useAccordionItem();
    const accordion = useAccordion();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented && accordion) {
        accordion.onToggle(value);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={isOpen}
        data-state={isOpen ? "open" : "closed"}
        onClick={handleClick}
        className={cn(
          "group flex w-full min-h-[48px] items-center justify-between text-left transition duration-fast select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">{children}</div>
        {!hideChevron && (
          <div
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full bg-white/80 text-secondary transition-transform duration-200 ease-out group-hover:text-ink group-active:scale-press",
              isOpen && "rotate-180 bg-ink text-white",
              chevronClassName
            )}
          >
            <ArrowDown2 size={18} variant="Linear" />
          </div>
        )}
      </button>
    );
  }
);
AccordionTrigger.displayName = "AccordionTrigger";

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen } = useAccordionItem();
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        ref={ref}
        initial={false}
        animate={
          isOpen
            ? {
                height: "auto",
                opacity: 1,
                visibility: "visible",
                transition: shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.2, delay: 0.04 },
                    },
              }
            : {
                height: 0,
                opacity: 0,
                transitionEnd: { visibility: "hidden" },
                transition: shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      height: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.15 },
                    },
              }
        }
        style={{ overflow: "hidden" }}
      >
        <div
          data-state={isOpen ? "open" : "closed"}
          className={cn("pt-1 pb-2", className)}
          {...props}
        >
          {children}
        </div>
      </motion.div>
    );
  }
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
