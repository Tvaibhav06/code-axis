"use client";
import { useEffect, useState } from "react";
import { MAX_IMAGE_BYTES } from "@/lib/image-schema";

async function assetPost(action: string, body: unknown) {
  const response = await fetch(`/api/assets/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(55_000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Image action failed (${response.status}).`);
  return data.result;
}
export function AssetPreview({ path, alt }: { path: string | null; alt: string }) {
  const [url, setUrl] = useState(""); const [error, setError] = useState("");
  async function load() {
    const response = await fetch(`/api/assets/view?path=${encodeURIComponent(path || "")}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.url) throw new Error(data?.error || "Preview unavailable.");
    setUrl(data.url); setError("");
  }
  useEffect(() => {
    let active = true;
    if (path) fetch(`/api/assets/view?path=${encodeURIComponent(path)}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.url) throw new Error(data?.error || "Preview unavailable.");
        return data.url as string;
      })
      .then((url) => { if (active) setUrl(url); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Preview unavailable."); });
    return () => { active = false; };
  }, [path]);
  if (!path) return null;
  return <figure className="asset-preview">{/* Signed private URLs cannot use the public Next image optimiser. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {url && <img src={url} alt={alt} referrerPolicy="no-referrer" onError={() => setError("Preview expired or failed. Reload the preview.")} />}
    <figcaption>{error || "Private preview, valid for five minutes."} <button type="button" className="text-button" onClick={() => load().catch((e) => setError(e instanceof Error ? e.message : "Preview unavailable."))}>Reload preview</button></figcaption>
  </figure>;
}
export function AssetUpload({ label, onUploaded, disabled, onBusyChange }: { label: string; onUploaded: (path: string) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); onBusyChange?.(true); setMessage("");
    try {
      if (!["image/png", "image/jpeg"].includes(file.type) || file.size > MAX_IMAGE_BYTES) throw new Error("Choose a PNG/JPG up to 5 MB.");
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(55_000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `Upload failed (${response.status}).`);
      onUploaded(data.result.path);
      setMessage("Image validated. Save/publish to include it in a version.");
    } catch (e) {
      console.error("Upload failed:", e);
      setMessage(e instanceof Error ? e.message : "Upload could not finish. No saved version was changed.");
    }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <div><label>{label}<input type="file" accept="image/png,image/jpeg" disabled={disabled || busy} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void upload(file); }} /></label>
    <p className="help-text">Still PNG/JPG, up to 5 MB, 4096 pixels per side, 16 megapixels. Originals stay private and unchanged.</p>{(busy || message) && <p role="status">{busy ? "Uploading and checking image…" : message}</p>}</div>;
}
