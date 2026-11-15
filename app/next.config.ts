import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Η δημόσια σελίδα του Συνδέσμου πρότασης (/p/<token>): το token δεν φεύγει ως Referer, δεν ευρετηριάζεται, δεν αποθηκεύεται σε cache.
// Δηλώνεται μετά τα γενικά headers, ώστε το Referrer-Policy της να υπερισχύει.
const proposalHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" },
];

// Το PDF Τιμολογίου (έως 4 MB) ανεβαίνει μέσα από server action· το Vercel κόβει σώματα πάνω από 4,5 MB.
const nextConfig: NextConfig = {
  // Η γραμματοσειρά του PDF Συμφωνίας διαβάζεται από τον δίσκο: μπαίνει στο function του route που φτιάχνει το PDF.
  outputFileTracingIncludes: {
    "/app/agreements/*/pdf": ["./src/modules/agreements/pdf/fonts/*.ttf"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Ταχύτητα: μια οθόνη που είδες πριν από λίγο ξανανοίγει αμέσως (πίσω/μπρος, μενού) για 30″. Κάθε αλλαγή που κάνεις
    // (server action με revalidatePath) την ξαναφορτώνει· αλλαγές άλλων φαίνονται το αργότερο σε 30″.
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/p/:token*", headers: proposalHeaders },
    ];
  },
};

export default nextConfig;
