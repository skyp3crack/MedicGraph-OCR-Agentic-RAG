"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { fetchAuditLogs, AuditLogEntry } from "../utils/api";
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownMenu, DropdownItem, Button, Label } from "@heroui/react";

export default function AuditPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  // Mobile sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Pagination and Audit Logs State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Log detail popup state
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Auth guard: redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch audit logs
  const loadLogs = async (p: number) => {
    setIsFetching(true);
    setErrorMsg(null);
    try {
      const res = await fetchAuditLogs(p, limit);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to fetch audit logs from the database.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadLogs(page);
    }
  }, [page, limit, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-outline-variant border-t-primary animate-spin" />
          <p className="text-sm text-on-surface-variant font-medium">Loading clinical workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const totalPages = Math.ceil(total / limit) || 1;
  const startEntry = total === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, total);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-background">
      {/* MOBILE HEADER */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-inverse-surface text-on-primary border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 hover:bg-white/10 rounded-lg flex items-center justify-center focus:outline-none"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <span className="font-bold text-sm tracking-tight">MedicoAgenticAI</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-fixed/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">account_circle</span>
        </div>
      </header>

      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-[fadeIn_0.2s_ease-out]"
        />
      )}

      {/* PRIMARY LEFT SIDEBAR */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-[260px] flex-shrink-0 bg-inverse-surface flex flex-col shadow-lg md:shadow-sm border-r border-outline-variant/10 text-on-primary transform transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                clinical_notes
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-primary-fixed text-headline-md leading-none">MedicoAgenticAI</h1>
              <span className="text-[9px] text-surface-variant/70 uppercase tracking-widest font-bold mt-1">
                MedicGraph
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 text-surface-variant hover:text-white rounded-lg flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide py-2">
          <div className="text-[10px] text-surface-variant font-bold uppercase tracking-widest px-2 mb-2">
            Agentic Pipelines
          </div>
          <a
            className="text-surface-variant flex items-center gap-3 px-6 py-3 hover:bg-surface-variant/10 hover:text-primary-fixed-dim transition-colors duration-200"
            href="/"
          >
            <span className="material-symbols-outlined text-sm">map_pin_review</span>
            <span className="text-body-md">Pipeline Overview</span>
          </a>
          <a
            className="text-primary-fixed-dim font-bold border-l-4 border-primary-fixed pl-4 flex items-center gap-3 py-3 hover:bg-surface-variant/10 transition-colors duration-200"
            href="/audit"
          >
            <span className="material-symbols-outlined text-sm">batch_prediction</span>
            <span className="text-body-md">Active Batches</span>
          </a>
          <a
            className="text-surface-variant flex items-center gap-3 px-6 py-3 hover:bg-surface-variant/10 hover:text-primary-fixed-dim transition-colors duration-200"
            href="#"
          >
            <span className="material-symbols-outlined text-sm">rule_settings</span>
            <span className="text-body-md">Validation Tasks</span>
            <span className="ml-auto bg-primary-container text-on-primary-container px-1.5 py-0.5 rounded text-[10px] font-bold">
              12
            </span>
          </a>
          <a
            className="text-surface-variant flex items-center gap-3 px-6 py-3 hover:bg-surface-variant/10 hover:text-primary-fixed-dim transition-colors duration-200"
            href="#"
          >
            <span className="material-symbols-outlined text-sm">analytics</span>
            <span className="text-body-md">System Health</span>
          </a>
          <a
            className="text-surface-variant flex items-center gap-3 px-6 py-3 hover:bg-surface-variant/10 hover:text-primary-fixed-dim transition-colors duration-200"
            href="#"
          >
            <span className="material-symbols-outlined text-sm">settings</span>
            <span className="text-body-md">Settings</span>
          </a>
        </nav>

        <footer className="p-4 flex flex-col gap-2 border-t border-surface-variant/10 bg-slate-900/50">
          <div className="relative">
            <Dropdown>
              <DropdownTrigger>
                <div
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-variant/10 transition-colors cursor-pointer group text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-fixed/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary-fixed-dim text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      account_circle
                    </span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[12px] text-inverse-on-surface font-bold truncate">
                      {user?.name || "User"}
                    </div>
                    <div className="text-[10px] text-surface-variant/60 truncate">
                      {user?.email || ""}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-surface-variant/50 text-[14px] group-hover:text-surface-variant transition-colors">
                    expand_more
                  </span>
                </div>
              </DropdownTrigger>
              <DropdownPopover className="bg-slate-900 border border-surface-variant/20 text-white rounded-lg shadow-xl min-w-[200px] z-50">
                <DropdownMenu
                  aria-label="User actions dropdown"
                  onAction={(key) => {
                    if (key === "logout") logout();
                  }}
                >
                  <DropdownItem
                    id="settings"
                    textValue="Account Settings"
                    className="hover:bg-white/10 rounded cursor-pointer p-2"
                  >
                    <div className="flex items-center gap-2 text-white">
                      <span className="material-symbols-outlined text-[16px]">settings</span>
                      <Label className="text-xs cursor-pointer">Account Settings</Label>
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    id="docs"
                    textValue="Documentation"
                    className="hover:bg-white/10 rounded cursor-pointer p-2"
                  >
                    <div className="flex items-center gap-2 text-white">
                      <span className="material-symbols-outlined text-[16px]">help</span>
                      <Label className="text-xs cursor-pointer">Documentation</Label>
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    id="logout"
                    textValue="Sign Out"
                    className="hover:bg-danger/10 rounded cursor-pointer p-2"
                  >
                    <div className="flex items-center gap-2 text-danger">
                      <span className="material-symbols-outlined text-[16px] text-danger">logout</span>
                      <Label className="text-xs text-danger cursor-pointer">Sign Out</Label>
                    </div>
                  </DropdownItem>
                </DropdownMenu>
              </DropdownPopover>
            </Dropdown>
          </div>
          <div className="text-on-surface-variant/40 text-[9px] px-2 font-bold tracking-widest uppercase">
            v4.2 Clinical Protocol
          </div>
        </footer>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {/* HEADER BAR */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-outline-variant/15 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-on-surface-variant/60 font-medium">Clinical Workbench</span>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant/40">chevron_right</span>
            <span className="text-body-sm text-on-surface font-bold">Audit Trails & Logs</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-secondary-fixed/15 text-secondary-fixed-dim border border-secondary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Secured PHI Node</span>
            </div>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Audit Logs</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                De-identified history of clinician action logs and ICD-11 modifications.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-outline-variant/30 text-on-surface hover:bg-slate-50 flex items-center gap-1 h-9 rounded bg-white px-3 font-semibold"
              onClick={() => {
                setPage(1);
                loadLogs(1);
              }}
              isDisabled={isFetching}
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh Logs
            </Button>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-lg bg-error-container text-on-error-container border border-error/20 text-xs">
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {/* TABLE PANEL */}
          <div className="flex-1 bg-white border border-outline-variant/15 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-x-auto min-h-[300px]">
              {isFetching ? (
                <div className="w-full h-full flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
                  <p className="text-xs text-on-surface-variant">Fetching audit logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center py-20 text-center px-4">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-2">
                    history_toggle_off
                  </span>
                  <h3 className="text-title-sm font-bold text-on-surface">No audit logs found</h3>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                    Perform validation and audit approvals on the Pipeline Overview page to generate clinical logs.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-outline-variant/15 text-slate-700 font-semibold text-xs">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Clinician</th>
                      <th className="p-4">Document ID</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Edited Fields</th>
                      <th className="p-4 text-center">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-xs text-on-surface-variant">
                    {logs.map((log) => {
                      const isApprove = log.action === "approve";
                      const isReject = log.action === "reject";
                      const isEscalate = log.action === "escalate";
                      const editedFields = log.payload?.edited_fields || [];

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono whitespace-nowrap">
                            {log.timestamp ? log.timestamp.substring(0, 16).replace("T", " ") : "N/A"}
                          </td>
                          <td className="p-4 font-medium truncate max-w-[150px]" title={log.clinician_email}>
                            {log.clinician_email}
                          </td>
                          <td className="p-4 font-mono truncate max-w-[150px]" title={log.document_id}>
                            {log.document_id}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                isApprove
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : isReject
                                  ? "bg-error/10 text-error border-error/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              }`}
                            >
                              <span
                                className={`w-1 h-1 rounded-full ${
                                  isApprove
                                    ? "bg-emerald-500"
                                    : isReject
                                    ? "bg-error"
                                    : "bg-amber-500"
                                }`}
                              />
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4">
                            {editedFields.length === 0 ? (
                              <span className="text-[10px] text-on-surface-variant/40 italic">None</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {editedFields.map((f, i) => (
                                  <span
                                    key={i}
                                    className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Button
                              isIconOnly
                              size="sm"
                              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center mx-auto text-on-surface-variant focus:outline-none"
                              onClick={() => setSelectedLog(log)}
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* PAGINATION BAR */}
            {total > 0 && (
              <div className="px-6 py-4 border-t border-outline-variant/15 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                <span className="text-xs text-on-surface-variant">
                  Showing <strong className="font-semibold text-on-surface">{startEntry}</strong> to{" "}
                  <strong className="font-semibold text-on-surface">{endEntry}</strong> of{" "}
                  <strong className="font-semibold text-on-surface">{total}</strong> entries
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    className="h-8 rounded-md bg-white border border-outline-variant/20 hover:bg-slate-50 text-xs px-3 focus:outline-none"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    isDisabled={page === 1}
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      className={`h-8 w-8 min-w-8 rounded-md text-xs focus:outline-none font-bold ${
                        page === p
                          ? "bg-primary text-white hover:bg-primary-container"
                          : "bg-white border border-outline-variant/20 hover:bg-slate-50 text-on-surface-variant"
                      }`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}

                  <Button
                    size="sm"
                    className="h-8 rounded-md bg-white border border-outline-variant/20 hover:bg-slate-50 text-xs px-3 focus:outline-none"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    isDisabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* DETAIL MODAL popup */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white border border-outline-variant/20 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-outline-variant/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  history
                </span>
                <h3 className="font-bold text-title-sm text-on-surface">Audit Payload Detail</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-on-surface-variant/60 hover:text-on-surface hover:bg-slate-200/50 rounded-lg flex items-center justify-center focus:outline-none"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs text-on-surface-variant">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/60">
                    Clinician Email
                  </span>
                  <span className="font-semibold text-on-surface">{selectedLog.clinician_email}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/60">
                    Action Type
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border mt-1 ${
                      selectedLog.action === "approve"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : selectedLog.action === "reject"
                        ? "bg-error/10 text-error border-error/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/60">
                    Document UUID
                  </span>
                  <span className="font-mono text-on-surface break-all">{selectedLog.document_id}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/60">
                    Audit Timestamp
                  </span>
                  <span className="font-mono text-on-surface">
                    {selectedLog.timestamp ? selectedLog.timestamp.replace("T", " ") : "N/A"}
                  </span>
                </div>
              </div>

              {/* JSON Metadata Payload */}
              <div className="space-y-2">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/60">
                  De-Identified Action Metadata (Safe Payload)
                </span>
                <pre className="p-4 bg-slate-900 text-slate-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-outline-variant/10 shadow-inner scrollbar-hide">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-outline-variant/15 flex justify-end">
              <Button
                size="sm"
                className="bg-primary text-white hover:bg-primary-container h-9 px-4 rounded font-bold"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
