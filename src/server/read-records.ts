import "server-only";
// Full export/aggregation reads page through the API instead of accepting its
// default row cap. Normal screen reads request only their bounded recent window.
export async function readRecords<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, full: boolean, recent = 20) {
  const rows: T[] = [];
  const size = full ? 200 : recent;
  for (let offset = 0; ; offset += size) {
    const result = await read(offset, offset + size - 1);
    if (result.error || !result.data) return { data: null, error: result.error || new Error("Read unavailable") };
    rows.push(...result.data);
    if (!full || result.data.length < size) return { data: rows, error: null };
  }
}
