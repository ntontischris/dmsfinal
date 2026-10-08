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

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/p/:token*", headers: proposalHeaders },
    ];
  },
};

export default nextConfig;
