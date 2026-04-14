"use client";

import { useState, useEffect, useCallback } from "react";
import type { Application } from "@/types";

interface UseApplicationsReturn {
  applications: Application[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createApplication: (
    data: Omit<Application, "id" | "rowIndex" | "dateAdded">
  ) => Promise<{ application: Application; blacklistWarning?: string }>;
  updateApplication: (app: Application) => Promise<Application>;
  deleteApplication: (id: string) => Promise<void>;
}

export function useApplications(): UseApplicationsReturn {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/applications");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch");
      setApplications(json.data ?? []);
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

  const createApplication = useCallback(
    async (
      data: Omit<Application, "id" | "rowIndex" | "dateAdded">
    ): Promise<{ application: Application; blacklistWarning?: string }> => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create");
      setApplications((prev) => [...prev, json.data]);
      return {
        application: json.data,
        blacklistWarning: json.blacklistWarning,
      };
    },
    []
  );

  const updateApplication = useCallback(
    async (app: Application): Promise<Application> => {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update");
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? json.data : a))
      );
      return json.data;
    },
    []
  );

  const deleteApplication = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to delete");
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    applications,
    loading,
    error,
    refresh,
    createApplication,
    updateApplication,
    deleteApplication,
  };
}
