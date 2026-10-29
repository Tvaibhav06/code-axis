"use client";
import { useState } from "react";

async function imageTextPost(action: string, body: unknown) {
  const response = await fetch(`/api/image-text/${action}`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Image text action failed.");
  return data.result;
}

// Commitment 1: the creator sees recognised text, corrects or confirms it, and
// only confirmed text is joined to the copy for checking.
export function ImageTextReview({ imagePath, onConfirmed }: { imagePath: string; onConfirmed: (text: string) => void }) {
  const [recognized, setRecognized] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [manualReviewRequired, setManualReviewRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function recognize() {
    setBusy(true); setError("");
    try {
      const result = await imageTextPost("recognize", { path: imagePath });
      setRecognized(result.recognized || "");
      setConfidence(result.confidence || 0);
      setManualReviewRequired(!!result.manualReviewRequired);
      setConfirmed(result.recognized || "");
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Recognition failed."); }
    finally { setBusy(false); }
  }

  function confirm() {
    if (!confirmed.trim()) { setError("Confirm or correct the recognised text."); return; }
    onConfirmed(confirmed);
  }

  return <div className="image-text-panel">
    <h3>Text inside this image</h3>
    {busy ? <p role="status">Reading text from the image…</p>
      : !done ? <><p className="help-text">Read the text inside the image before checking it against approved sources.</p>
        <button type="button" className="secondary-button" onClick={() => void recognize()}>Read text from this image</button></>
      : manualReviewRequired ? <p role="alert" className="form-error">The image text is not readable. Manual review is required; the image is not checked automatically.</p>
      : <>
        <p className="help-text">Recognised text (confidence {confidence}%). Correct it before confirming.</p>
        <label>Recognised text<textarea rows={4} value={recognized} readOnly /></label>
        <label>Confirmed text (edit then confirm)<textarea rows={4} value={confirmed} onChange={(e) => setConfirmed(e.target.value)} /></label>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={confirm}>Confirm image text</button>
          <button type="button" className="text-button" onClick={() => void recognize()}>Re-read image</button></div>
      </>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <p className="help-text">Only confirmed text is joined to the campaign copy for checking. Unreadable images ask for manual review and are not checked automatically.</p>
  </div>;
}