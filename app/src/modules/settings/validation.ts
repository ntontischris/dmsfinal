// Έλεγχοι εγκυρότητας για τα στοιχεία που τυπώνονται σε Συμφωνίες και εντολές πληρωμής (κεφ. 5).

// ΑΦΜ: 9 ψηφία, το τελευταίο είναι ψηφίο ελέγχου (άθροισμα ψηφίων × δυνάμεις του 2, mod 11, mod 10).
export const isValidAfm = (value: string): boolean => {
  if (!/^\d{9}$/.test(value) || value === "000000000") return false;
  const digits = [...value].map(Number);
  const sum = digits.slice(0, 8).reduce((total, digit, index) => total + digit * 2 ** (8 - index), 0);
  return (sum % 11) % 10 === digits[8];
};

// IBAN: χωρίς κενά, κεφαλαία· οι δύο πρώτοι χαρακτήρες πάνε στο τέλος, τα γράμματα γίνονται αριθμοί, mod 97 = 1.
export const normalizeIban = (value: string): string => value.replace(/\s+/g, "").toUpperCase();

export const isValidIban = (value: string): boolean => {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith("GR") && iban.length !== 27) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  const numeric = [...rearranged].map((char) => (/[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char)).join("");
  return [...numeric].reduce((rest, digit) => (rest * 10 + Number(digit)) % 97, 0) === 1;
};

// Για εμφάνιση: σε τετράδες, όπως τυπώνεται.
export const formatIban = (value: string): string => normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
