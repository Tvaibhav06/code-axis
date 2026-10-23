"use client";
export async function reviewPost(action: string, input: unknown) {
  let response;
  try { response = await fetch(`/api/review/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(55_000) }); }
  catch { throw new Error("The action could not be confirmed. Load latest before retrying; a check may have used an attempt."); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error || "The action could not be confirmed. Load latest before retrying.");
  return data.result;
}
