"use client";

import { useState, useMemo } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { useNetworking } from "@/hooks/useNetworking";
import { DashboardSummary } from "@/components/applications/DashboardSummary";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { CompanyContactsPanel } from "@/components/applications/CompanyContactsPanel";
import type { Application } from "@/types";

export default function ApplicationsPage() {
  const { applications, loading, createApplication, updateApplication, deleteApplication } =
    useApplications();
  const { contacts, getContactsByCompany } = useNetworking();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Application | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [blacklistWarning, setBlacklistWarning] = useState<string | null>(null);

  // Count contacts per company for the table
  const contactCountByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    for (const contact of contacts) {
      const key = contact.companyName.toLowerCase();
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [contacts]);

  async function handleCreate(
    data: Omit<Application, "id" | "rowIndex" | "dateAdded">
  ) {
    const result = await createApplication(data);
    if (result.blacklistWarning) {
      setBlacklistWarning(result.blacklistWarning);
    }
  }

  async function handleUpdate(
    data: Omit<Application, "id" | "rowIndex" | "dateAdded">
  ) {
    if (!editTarget) return;
    await updateApplication({ ...editTarget, ...data });
    setEditTarget(null);
  }

  async function handleDelete(app: Application) {
    if (!confirm(`Delete application for ${app.roleTitle} at ${app.companyName}?`)) return;
    await deleteApplication(app.id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#4b5563] text-sm">
        Loading applications...
      </div>
    );
  }

  const panelContacts = selectedCompany
    ? getContactsByCompany(selectedCompany)
    : [];

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-[#e8e8e8]">
                Applications
              </h1>
              <p className="text-xs text-[#6b7280] mt-0.5">
                {applications.length} total
              </p>
            </div>
            <button
              className="btn-primary flex items-center gap-1.5"
              onClick={() => setFormOpen(true)}
            >
              <Plus size={14} />
              Add Application
            </button>
          </div>

          {/* Blacklist warning toast */}
          {blacklistWarning && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
              <AlertTriangle size={16} className="text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-orange-300">{blacklistWarning}</p>
              </div>
              <button
                className="text-[#6b7280] hover:text-[#e8e8e8] text-xs"
                onClick={() => setBlacklistWarning(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Summary stats */}
          <DashboardSummary applications={applications} />

          {/* Table */}
          <ApplicationsTable
            applications={applications}
            onRowClick={(app) => setEditTarget(app)}
            onEdit={(app) => setEditTarget(app)}
            onDelete={handleDelete}
            onViewContacts={(company) => setSelectedCompany(company)}
            contactCountByCompany={contactCountByCompany}
          />
        </div>
      </div>

      {/* Company contacts side panel */}
      {selectedCompany && (
        <CompanyContactsPanel
          companyName={selectedCompany}
          contacts={panelContacts}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {/* Create form */}
      <ApplicationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        mode="create"
      />

      {/* Edit form */}
      {editTarget && (
        <ApplicationForm
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
          initial={editTarget}
          onSubmit={handleUpdate}
          mode="edit"
        />
      )}
    </div>
  );
}
