// Η αναμονή ανάμεσα σε σελίδες: το κέλυφος (μπάρα, Χώροι) μένει, μόνο το περιεχόμενο γίνεται σκελετός.
// Χωρίς αυτό το Next δεν προφορτώνει τίποτα από τις δυναμικές σελίδες και η οθόνη «παγώνει» ως την πλήρη απάντηση.
// Το χρώμα έρχεται από το κείμενο (bg-current), ώστε να ταιριάζει και στις δύο εμφανίσεις.
const BLOCKS = ["h-24", "h-40", "h-40", "h-64"] as const;

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto grid w-full max-w-6xl gap-4 p-4 md:p-6"
    >
      <span className="sr-only">Φόρτωση…</span>
      <div className="h-8 w-48 rounded-md bg-current opacity-10 motion-safe:animate-pulse" />
      {BLOCKS.map((height, index) => (
        <div
          key={index}
          className={`${height} rounded-xl bg-current opacity-[0.06] motion-safe:animate-pulse`}
        />
      ))}
    </div>
  );
}
