// Κανόνες ανεβάσματος της Γνώσης. Ταυτίζονται με της βάσης (authz.knowledge_ext, knowledge_upload_slot): έως 25 MB,
// Αρχείο = PDF, DOCX, PPTX ή εικόνα· εικόνα μέσα σε Άρθρο = JPG, PNG, WEBP, GIF. Ελέγχονται εδώ για άμεσο μήνυμα.

export type UploadPurpose = "file" | "image";

export const KNOWLEDGE_BUCKET = "knowledge";
export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export const FILE_MIMES: readonly string[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ...IMAGE_MIMES,
];

export const ARTICLE_IMAGE_MIMES: readonly string[] = [
  ...IMAGE_MIMES,
  "image/gif",
];

export const ERROR_FILE_TYPE = "Επιτρέπονται PDF, DOCX, PPTX και εικόνες";
export const ERROR_IMAGE_TYPE = "Επιτρέπονται εικόνες JPG, PNG, WEBP και GIF";
export const ERROR_TOO_BIG = "Το αρχείο ξεπερνά τα 25 MB";
export const ERROR_EMPTY = "Το αρχείο είναι κενό";

export const acceptOf = (purpose: UploadPurpose): string =>
  (purpose === "file" ? FILE_MIMES : ARTICLE_IMAGE_MIMES).join(",");

export interface UploadCandidate {
  type: string;
  size: number;
}

// Το λάθος ενός αρχείου πριν ανέβει, ή null αν περνά.
export const uploadError = (
  purpose: UploadPurpose,
  file: UploadCandidate,
): string | null => {
  const allowed = purpose === "file" ? FILE_MIMES : ARTICLE_IMAGE_MIMES;
  if (!allowed.includes(file.type))
    return purpose === "file" ? ERROR_FILE_TYPE : ERROR_IMAGE_TYPE;
  if (file.size < 1) return ERROR_EMPTY;
  if (file.size > UPLOAD_MAX_BYTES) return ERROR_TOO_BIG;
  return null;
};

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};
