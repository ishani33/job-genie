"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useNetworking } from "@/hooks/useNetworking";
import { useApplications } from "@/hooks/useApplications";
import { NetworkingTable } from "@/components/networking/NetworkingTable";
import { ContactForm } from "@/components/networking/ContactForm";
import type { Contact } from "@/types";

export default function NetworkingPage() {
  const { contacts, loading, createContact, updateContact, deleteContact, patchContact } =
    useNetworking();
  const { applications } = useApplications();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);

  async function handleCreate(data: Omit<Contact, "id" | "rowIndex">) {
    await createContact(data);
  }

  async function handleUpdate(data: Omit<Contact, "id" | "rowIndex">) {
    if (!editTarget) return;
    await updateContact({ ...editTarget, ...data });
    setEditTarget(null);
  }

  async function handleDelete(contact: Contact) {
    if (
      !confirm(
        `Delete contact ${contact.contactName} at ${contact.companyName}?`
      )
    )
      return;
    await deleteContact(contact.id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#4b5563] text-sm">
        Loading contacts...
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#e8e8e8]">Networking</h1>
          <p className="text-xs text-[#6b7280] mt-0.5">
            {contacts.length} contacts
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-1.5"
          onClick={() => setFormOpen(true)}
        >
          <Plus size={14} />
          Add Contact
        </button>
      </div>

      {/* Table */}
      <NetworkingTable
        contacts={contacts}
        applications={applications}
        onEdit={(contact) => setEditTarget(contact)}
        onDelete={handleDelete}
        onContactUpdate={patchContact}
      />

      {/* Create form */}
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        mode="create"
      />

      {/* Edit form */}
      {editTarget && (
        <ContactForm
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
