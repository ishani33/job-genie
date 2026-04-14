"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Users, ChevronRight, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/applications",
    label: "Applications",
    icon: Briefcase,
  },
  {
    href: "/networking",
    label: "Networking",
    icon: Users,
  },
  {
    href: "/resume-matcher",
    label: "Resume Matcher",
    icon: FileSearch,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[#2a2a2a] flex flex-col bg-[#111111] h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#3b82f6] rounded-md flex items-center justify-center">
            <ChevronRight size={14} className="text-white" strokeWidth={3} />
          </div>
          <span className="font-semibold text-[#e8e8e8] text-sm tracking-tight">
            Job Search
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "sidebar-item",
                active && "sidebar-item-active"
              )}
            >
              <Icon size={15} className={cn(!active && "opacity-60")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#2a2a2a]">
        <p className="text-[10px] text-[#4b5563]">
          Powered by Claude
        </p>
      </div>
    </aside>
  );
}
