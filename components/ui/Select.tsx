"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onValueChange,
  placeholder = "Select...",
  options,
  className,
  disabled,
}: SelectProps) {
  return (
    <RadixSelect.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        className={cn(
          "input-base flex items-center justify-between w-full gap-2",
          "data-[placeholder]:text-[#6b7280]",
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown size={14} className="text-[#6b7280] shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden animate-fade-in"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport className="p-1 max-h-72 overflow-y-auto">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md text-sm",
                  "text-[#e8e8e8] cursor-pointer outline-none",
                  "hover:bg-[#252525] data-[highlighted]:bg-[#252525]",
                  "data-[state=checked]:text-[#3b82f6]"
                )}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={12} />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
