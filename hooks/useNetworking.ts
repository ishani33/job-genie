"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact } from "@/types";

interface UseNetworkingReturn {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createContact: (data: Omit<Contact, "id" | "rowIndex">) => Promise<Contact>;
  updateContact: (contact: Contact) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  getContactsByCompany: (companyName: string) => Contact[];
  /** Patch a single contact in local state without an API call. */
  patchContact: (updated: Contact) => void;
}

export function useNetworking(): UseNetworkingReturn {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/networking");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch");
      setContacts(json.data ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createContact = useCallback(
    async (data: Omit<Contact, "id" | "rowIndex">): Promise<Contact> => {
      const res = await fetch("/api/networking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create");
      setContacts((prev) => [...prev, json.data]);
      return json.data;
    },
    []
  );

  const updateContact = useCallback(
    async (contact: Contact): Promise<Contact> => {
      const res = await fetch(`/api/networking/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update");
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? json.data : c))
      );
      return json.data;
    },
    []
  );

  const deleteContact = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/networking/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to delete");
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getContactsByCompany = useCallback(
    (companyName: string): Contact[] => {
      return contacts.filter(
        (c) =>
          c.companyName.toLowerCase() === companyName.toLowerCase()
      );
    },
    [contacts]
  );

  const patchContact = useCallback((updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  return {
    contacts,
    loading,
    error,
    refresh,
    createContact,
    updateContact,
    deleteContact,
    getContactsByCompany,
    patchContact,
  };
}
