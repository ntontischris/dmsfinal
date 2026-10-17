// Μόνο στον browser: το αρχείο φτιάχνεται εκεί και κατεβαίνει αμέσως (Ρ6), χωρίς να ξαναπεράσει από τον server.

export const ZIP_MIME = "application/zip";

export function saveBytes(bytes: Uint8Array, name: string, mime: string): void {
  const copy = new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
