// Ποσά και ημερομηνίες του module, καθαρές συναρτήσεις. Το ευρώ μορφοποιείται όπως στον Κατάλογο και στην G3.

const MONEY = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" });
const ATHENS_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" });

export const formatReceiptMoney = (amount: number): string => MONEY.format(amount);

// Σημερινή μέρα στην Ελλάδα, ως YYYY-MM-DD (η προεπιλογή της φόρμας).
export const athensToday = (now: Date = new Date()): string => ATHENS_DAY.format(now);

// Αριθμός από κείμενο με το πολύ 2 δεκαδικά («150,50»). Άκυρο = undefined.
export const parseReceiptAmount = (text: string): number | undefined => {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  return Number(normalized);
};

export const decimalText = (value: number): string => String(value).replace(".", ",");

// Ημερομηνία από YYYY-MM-DD σε ΗΗ/ΜΜ/ΕΕΕΕ.
export const formatReceiptDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};
