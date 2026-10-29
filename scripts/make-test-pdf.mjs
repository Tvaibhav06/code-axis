// Test-fixture generator only (not shipped application code).
// Builds a minimal valid text PDF by hand so extraction, page mapping and every
// rejection path can be exercised without an external PDF writer dependency.
// Object layout: 1 font · 2 catalog · 3 pages tree · 4..(3+N) page dicts · (4+N)..(3+2N) content streams
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

// PDF 1.4 §Algorithm 1 padding, fixed by the specification.
const PAD = Buffer.from([
  0x28, 0xbf, 0x4e, 0x5e, 0x46, 0x58, 0x8f, 0xb8, 0x1a, 0x4e, 0x29, 0x2f, 0x1c, 0x50, 0x20, 0x68,
  0x50, 0x70, 0x6c, 0x61, 0x64, 0x6f, 0x6e, 0x74, 0x72, 0x6f, 0x70, 0x72, 0x65, 0x73, 0x73, 0x00,
]);

function padPassword(password) {
  const source = Buffer.from(password, "latin1");
  const target = Buffer.alloc(32);
  source.subarray(0, Math.min(32, source.length)).copy(target);
  PAD.subarray(0, 32 - Math.min(32, source.length)).copy(target, Math.min(32, source.length));
  return target;
}

// RC4 is only used for the /U value in the encryption dictionary fixture.
// It sits after startxref so pdf.js recovery scans still read the document.
function rc4Bytes(key, data) {
  // node:crypto has no RC4; the standard security handler needs it for /U only.
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + s[i] + key[i % key.length]) & 0xff; [s[i], s[j]] = [s[j], s[i]]; }
  const out = Buffer.alloc(data.length);
  let a = 0, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + 1) & 0xff; b = (b + s[a]) & 0xff;
    [s[a], s[b]] = [s[b], s[a]];
    out[i] = data[i] ^ s[(s[a] + s[b]) & 0xff];
  }
  return out;
}

// PDF 1.4 §Algorithm 2 with a 40-bit key: password + /O + /P + /ID[0] → file key.
function fileKey(password, ownerValue, permissions, idBytes) {
  const digest = createHash("md5").update(Buffer.concat([padPassword(password), ownerValue, int32LE(permissions), idBytes.subarray(0, 4)])).digest();
  return digest.subarray(0, 5);
}

const int32LE = (value) => { const b = Buffer.alloc(4); b.writeInt32LE(value, 0); return b; };

const escape = (s) => String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const hex = (bytes) => bytes.toString("hex").toUpperCase();

export function buildPdf(inputPages, options = {}) {
  const count = inputPages.length;
  const bodies = new Map();
  bodies.set(1, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  bodies.set(2, "<< /Type /Catalog /Pages 3 0 R >>");
  const kids = [];
  for (let i = 0; i < count; i++) {
    const pageRef = 4 + i;
    const contentRef = 4 + count + i;
    kids.push(pageRef);
    bodies.set(pageRef, `<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 1 0 R >> >> /Contents ${contentRef} 0 R >>`);
    // A page may be one string or an array of lines. A blank page holds no
    // selectable glyphs, which is the scanned-document fixture.
    const lines = Array.isArray(inputPages[i]) ? inputPages[i] : inputPages[i] ? [inputPages[i]] : [];
    const stream = lines.length
      ? `BT /F1 12 Tf 14 TL 72 750 Td\n${lines.map((line) => `(${escape(line)}) Tj T*`).join("\n")}\nET`
      : "";
    bodies.set(contentRef, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  bodies.set(3, `<< /Type /Pages /Kids [${kids.map((r) => `${r} 0 R`).join(" ")}] /Count ${count} >>`);

  const maxId = Math.max(...bodies.keys());
  let out = "%PDF-1.4\n";
  const offsets = [];
  for (let id = 1; id <= maxId; id++) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${bodies.get(id)}\nendobj\n`;
  }

  // A genuine standard-security-handler dictionary. The user password is real, so
  // a reader that supplies no password fails the /U check and reports a password
  // request rather than opening the document. The dictionary must live before the
  // xref table with its own entry: pdf.js resolves /Encrypt through the xref.
  if (options.userPassword) {
    const securityId = maxId + 1;
    const ownerValue = Buffer.alloc(32, 0x5a);
    const permissions = -3904;
    const idBytes = createHash("md5").update("brand-review-desk-fixture").digest();
    const key = fileKey(options.userPassword, ownerValue, permissions, idBytes);
    const userValue = rc4Bytes(key, PAD);
    const securityBody = `<< /Filter /Standard /V 1 /R 2 /Length 40 /P ${permissions} /O <${hex(ownerValue)}> /U <${hex(userValue)}>>`;
    offsets[securityId] = out.length;
    out += `${securityId} 0 obj\n${securityBody}\nendobj\n`;
    const xrefStart = out.length;
    out += `xref\n0 ${securityId + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= securityId; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${securityId + 1} /Root 2 0 R /Encrypt ${securityId} 0 R /ID [<${hex(idBytes)}> <${hex(idBytes)}>] >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    return out;
  }

  const xrefStart = out.length;
  out += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${maxId + 1} /Root 2 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return out;
}

if (process.argv[2]) {
  const pages = [
    "Approved trial duration: 14 days.",
    "Approved monthly price: INR 499 per month.",
    "Use the brand name SampleCo on all materials.",
  ];
  const out = buildPdf(pages);
  writeFileSync(process.argv[2], out);
  console.log(`Wrote ${out.length} bytes, ${pages.length} pages to ${process.argv[2]}`);
}
