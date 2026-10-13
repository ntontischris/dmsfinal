// Ποιοι σύνδεσμοι και ποιες εικόνες επιτρέπονται μέσα σε Άρθρο. Σύνδεσμοι: μόνο https:// ή εσωτερικές διαδρομές /app/….
// Εικόνες: μόνο οι εικόνες της Γνώσης (ιδιωτικό bucket, προβάλλονται με signed URL), ώστε να μη φορτώνει τίποτα από έξω.

const INTERNAL_PATH = /^\/app(\/[A-Za-z0-9\-._~%/?=&#]*)?$/;
const IMAGE_PATH =
  /^\/app\/knowledge\/[0-9a-f-]{36}\/images\/img-[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

const isHttps = (url: string): boolean => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

// Ένας σύνδεσμος του Άρθρου όπως θα γραφτεί στη σελίδα, ή κενό αν δεν επιτρέπεται.
export const safeLinkUrl = (url: string): string => {
  const value = url.trim();
  if (INTERNAL_PATH.test(value) && !value.includes("..")) return value;
  return isHttps(value) ? value : "";
};

export const safeImageUrl = (url: string): string => {
  const value = url.trim();
  return IMAGE_PATH.test(value) ? value : "";
};

export const isExternalLink = (url: string): boolean =>
  url.startsWith("https://");

// Η διαδρομή μιας εικόνας Άρθρου: το όνομα είναι το τελευταίο κομμάτι της διαδρομής στο Storage (<item>/img-….png).
export const articleImageSrc = (itemId: string, storagePath: string): string =>
  `/app/knowledge/${itemId}/images/${storagePath.split("/").pop() ?? ""}`;

// Το Markdown που μπαίνει στο κείμενο όταν ανεβαίνει εικόνα. Το όνομα του αρχείου χωρίς χαρακτήρες του Markdown.
export const imageMarkdown = (alt: string, src: string): string =>
  `![${alt.replace(/[[\]()!\\]/g, "").trim() || "εικόνα"}](${src})`;
