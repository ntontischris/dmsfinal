// Χρονόμετρο των κλήσεων προς τη βάση (PostgREST, Auth): ό,τι αργεί γράφεται στο log του server, για να ξέρουμε
// πού πάει ο χρόνος μιας οθόνης. Γράφεται μόνο το είδος της κλήσης (π.χ. rpc/sales_client_list) και η διάρκεια,
// ποτέ τα ορίσματα ή η αναζήτηση.
export const SLOW_CALL_MS = 40;

export const callNameOf = (url: string): string => {
  const { pathname } = new URL(url);
  return pathname.replace(/^\/(rest|auth)\/v1\//, "$1:");
};

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

export const timedFetch: typeof fetch = async (input, init) => {
  const started = performance.now();
  try {
    return await fetch(input, init);
  } finally {
    const ms = Math.round(performance.now() - started);
    if (ms >= SLOW_CALL_MS)
      console.info(`[db-slow] ${callNameOf(urlOf(input))} ${ms}ms`);
  }
};
