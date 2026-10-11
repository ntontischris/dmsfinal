// Κανόνες συνημμένων (Μ7). Ταυτίζονται με της βάσης (message_attachment_slots): έως 5 αρχεία, έως 10 MB το καθένα,
// εικόνες, PDF και έγγραφα Office· βίντεο ως link. Εδώ ελέγχονται πριν ανέβει οτιδήποτε, για άμεσο μήνυμα στον χρήστη.

export const ATTACHMENT_MAX_FILES = 5;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const ATTACHMENT_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
};

export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_EXTENSIONS).join(",");

export const ERROR_TOO_MANY = "Έως 5 αρχεία ανά Μήνυμα";
export const ERROR_TOO_BIG = "Πάνω από 10 MB: στείλε το ως link";
export const ERROR_VIDEO = "Το βίντεο στέλνεται ως link";
export const ERROR_TYPE = "Επιτρέπονται εικόνες, PDF και έγγραφα Office";
export const ERROR_EMPTY = "Το αρχείο είναι κενό";

export const extensionOf = (mime: string): string | null =>
  ATTACHMENT_EXTENSIONS[mime] ?? null;

export interface AttachmentCandidate {
  name: string;
  type: string;
  size: number;
}

const errorOfFile = (file: AttachmentCandidate): string | null => {
  if (file.type.startsWith("video/")) return ERROR_VIDEO;
  if (extensionOf(file.type) === null) return ERROR_TYPE;
  if (file.size < 1) return ERROR_EMPTY;
  if (file.size > ATTACHMENT_MAX_BYTES) return ERROR_TOO_BIG;
  return null;
};

// Το πρώτο λάθος μιας νέας επιλογής αρχείων, ή null αν περνούν όλα. `already` = όσα έχουν ήδη επιλεγεί στο Μήνυμα.
export const firstAttachmentError = (
  already: number,
  files: readonly AttachmentCandidate[],
): string | null => {
  if (already + files.length > ATTACHMENT_MAX_FILES) return ERROR_TOO_MANY;
  for (const file of files) {
    const error = errorOfFile(file);
    if (error !== null) return `${file.name}: ${error}`;
  }
  return null;
};

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};
