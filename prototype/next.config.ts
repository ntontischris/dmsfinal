import type { NextConfig } from 'next';

// SHOWCASE=1: το ξεχωριστό deploy που δείχνει μόνο τις 10 προτάσεις της Αρχικής·
// κάθε άλλη διεύθυνση γυρίζει στο /directions.
const SHOWCASE_REDIRECTS = [
  { source: '/:path((?!directions|_next|favicon).*)', destination: '/directions', permanent: false },
];

const nextConfig: NextConfig = {
  redirects: async () => (process.env.SHOWCASE === '1' ? SHOWCASE_REDIRECTS : []),
};

export default nextConfig;
