"use client";

import { useEffect, useState } from "react";
import { Loader2, FolderOpen } from "lucide-react";
import { Select } from "@/components/ui/Select";
import type { ResumeFolder } from "@/types/resume-matcher";

interface Tier3PickerProps {
  onSelect: (folder: ResumeFolder) => void;
}

export function Tier3Picker({ onSelect }: Tier3PickerProps) {
  const [folders, setFolders] = useState<ResumeFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/resume-matcher/list-folders")
      .then((r) => r.json())
      .then((json) => {
        setFolders(json.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not list resume folders");
        setLoading(false);
      });
  }, []);

  function handleUse() {
    const folder = folders.find((f) => f.companyFolder === selected);
    if (folder) onSelect(folder);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#6b7280] text-sm py-4">
        <Loader2 size={14} className="animate-spin" />
        Loading resume folders...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (folders.length === 0) {
    return (
      <div className="card px-4 py-6 text-center text-[#4b5563] text-sm">
        <FolderOpen size={20} className="mx-auto mb-2 opacity-40" />
        No resumes found in ~/OneDrive/Resumes/
      </div>
    );
  }

  const options = folders.map((f) => ({
    value: f.companyFolder,
    label: f.companyFolder,
  }));

  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs text-[#9ca3af] font-medium">
        Pick a resume to reuse:
      </p>
      <Select
        value={selected}
        onValueChange={setSelected}
        placeholder="Select company folder..."
        options={options}
      />
      <button
        className="btn-primary w-full"
        disabled={!selected}
        onClick={handleUse}
      >
        Use This Resume
      </button>
    </div>
  );
}
