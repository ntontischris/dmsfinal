// Το αρχείο του λογότυπου (e1): PNG, JPG ή WebP ως 1 MB, με έλεγχο των πρώτων bytes (όχι μόνο του τύπου που
// δηλώνει ο browser). Ίδια όρια με το migration· το SVG μένει έξω γιατί κουβαλά ενεργό περιεχόμενο.

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
export const LOGO_FILE_MESSAGE = "Ανέβασε PNG, JPG ή WebP έως 1 MB.";

const EXTENSIONS: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const startsWith = (bytes: Uint8Array, prefix: readonly number[], at = 0) =>
  prefix.every((value, index) => bytes[at + index] === value);

const SIGNATURES: Readonly<Record<string, (bytes: Uint8Array) => boolean>> = {
  png: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  // «RIFF» … «WEBP»
  webp: (bytes) =>
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8),
};

export const logoExtension = (type: string): string | null =>
  EXTENSIONS[type] ?? null;

export const isLogoFileOk = (file: unknown): file is File =>
  file instanceof File &&
  file.size > 0 &&
  file.size <= LOGO_MAX_BYTES &&
  logoExtension(file.type) !== null;

export const hasLogoSignature = (bytes: Uint8Array, ext: string): boolean =>
  SIGNATURES[ext]?.(bytes) ?? false;
