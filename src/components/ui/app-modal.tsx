"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Luna-styled modal — bottom sheet on mobile, centered on desktop. */
function AppModal({
  open,
  onOpenChange,
  children,
  className,
  maxWidth = "2xl",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "lg" | "2xl";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "z-[calc(var(--app-z-modal)+1)] flex max-h-[90dvh] w-full flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl ring-0",
          "top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 rounded-t-3xl",
          "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
          maxWidth === "lg" ? "sm:max-w-lg" : "sm:max-w-2xl",
          className,
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function AppModalHeader({
  className,
  children,
  onClose,
  title,
  description,
}: {
  className?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6",
        className,
      )}
    >
      {children ?? (
        <div className="min-w-0">
          {title && (
            <DialogTitle className="text-base font-bold text-slate-900 sm:text-lg">
              {title}
            </DialogTitle>
          )}
          {description && (
            <DialogDescription className="text-xs text-slate-400">
              {description}
            </DialogDescription>
          )}
        </div>
      )}
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="shrink-0 rounded-xl text-slate-400 hover:text-slate-700"
          aria-label="Close"
        >
          <X strokeWidth={2} className="size-4" />
        </Button>
      )}
    </div>
  );
}

function AppModalBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-5 py-4 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function AppModalFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-slate-100 px-5 py-4 sm:px-6",
        className,
      )}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
    >
      {children}
    </div>
  );
}

export { AppModal, AppModalHeader, AppModalBody, AppModalFooter };
