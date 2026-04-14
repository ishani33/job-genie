"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  size = "md",
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl",
            "w-full mx-4 animate-fade-in",
            SIZE_CLASSES[size],
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
            <div>
              <Dialog.Title className="text-base font-semibold text-[#e8e8e8]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-xs text-[#6b7280] mt-0.5">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="p-1.5 rounded-md hover:bg-[#252525] text-[#6b7280] hover:text-[#e8e8e8] transition-colors">
              <X size={16} />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
