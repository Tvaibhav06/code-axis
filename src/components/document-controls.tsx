"use client";
import { useState } from "react";

export function DocumentUpload({
  label = "Attach campaign brief (PDF, up to 5 pages, 2 MB)",
  onUploaded,
  disabled,
  onBusyChange,
}: {
  label?: string;
  onUploaded: (info: { path: string; text: string; pages: number }) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    onBusyChange?.(true);
    setMessage("");
    try {
      if (file.type !== "application/pdf" || file.size > 2 * 1024 * 1024) {
        throw new Error("Choose a text PDF up to 2 MB.");
      }
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/assets/upload-pdf", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(55_000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `Document upload failed (${response.status}).`);
      }
      const fullText = (data.result.pages as { num: number; text: string }[]).map((p) => p.text).join("\n");
      onUploaded({
        path: data.result.path,
        text: fullText,
        pages: data.result.total,
      });
      setMessage(`Document validated (${data.result.total} pages, ${data.result.wordCount} words). Save draft to include it.`);
    } catch (e) {
      console.error("Document upload failed:", e);
      setMessage(e instanceof Error ? e.message : "Document upload failed.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="document-upload">
      <label>
        {label}
        <input
          type="file"
          accept="application/pdf"
          disabled={disabled || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void upload(file);
          }}
        />
      </label>
      <p className="help-text">Text PDF up to 5 pages, 2 MB and 1,500 words. Scans and password-protected files are rejected.</p>
      {(busy || message) && <p role="status">{busy ? "Parsing and extracting PDF text…" : message}</p>}
    </div>
  );
}

export function DocumentPreview({
  path,
  pages,
  text,
  onRemove,
}: {
  path: string | null;
  pages: number;
  text: string;
  onRemove?: () => void;
}) {
  if (!path) return null;
  return (
    <div className="document-preview-card" style={{ padding: "0.75rem", border: "1px solid var(--border, #ccc)", borderRadius: "4px", margin: "0.5rem 0" }}>
      <h4>Attached document ({pages} {pages === 1 ? "page" : "pages"})</h4>
      <p className="help-text" style={{ fontSize: "0.85rem", color: "var(--muted, #666)" }}>Path: {path}</p>
      {text && (
        <details>
          <summary>View extracted document text ({text.split(/\s+/).filter(Boolean).length} words)</summary>
          <pre style={{ maxHeight: "150px", overflow: "auto", fontSize: "0.85rem", padding: "0.5rem", background: "var(--bg-subtle, #f5f5f5)" }}>{text}</pre>
        </details>
      )}
      {onRemove && (
        <button type="button" className="text-button" onClick={onRemove} style={{ marginTop: "0.5rem" }}>
          Remove document from draft
        </button>
      )}
    </div>
  );
}

