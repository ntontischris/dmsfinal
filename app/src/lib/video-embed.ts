// Από ένα link YouTube, Vimeo ή Drive στη διεύθυνση του player, ώστε το βίντεο να παίζει μέσα στην εφαρμογή.
// Κοινό για Παραδοτέα (σημειώσεις πάνω στο βίντεο) και Γνώση (άρθρα με βίντεο). Το σύστημα κρατά μόνο τον σύνδεσμο.
//
// YouTube και Vimeo λένε στη σελίδα τον τρέχοντα χρόνο με postMessage, και δέχονται «πήγαινε στο …».
// Το Drive δεν έχει τέτοιο κανάλι: εκεί ο χρόνος γράφεται με το χέρι.

export type VideoProvider = "youtube" | "vimeo" | "drive";

export interface VideoEmbed {
  provider: VideoProvider;
  src: string;
}

export interface EmbedOptions {
  origin?: string;
  startAt?: number;
  autoplay?: boolean;
}

const parse = (link: string): URL | null => {
  try {
    return new URL(link.trim());
  } catch {
    return null;
  }
};

const YOUTUBE_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
];

const youtubeId = (url: URL): string | null => {
  if (url.hostname === "youtu.be")
    return url.pathname.slice(1).split("/")[0] || null;
  const fromPath = url.pathname.match(
    /^\/(?:shorts|live|embed)\/([\w-]+)/,
  )?.[1];
  return fromPath ?? url.searchParams.get("v");
};

const providerOf = (url: URL): VideoProvider | null => {
  if (url.hostname === "drive.google.com") return "drive";
  if (url.hostname === "vimeo.com" || url.hostname.endsWith(".vimeo.com"))
    return "vimeo";
  if (YOUTUBE_HOSTS.includes(url.hostname)) return "youtube";
  return null;
};

const idOf = (provider: VideoProvider, url: URL): string | null => {
  if (provider === "drive")
    return url.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1] ?? null;
  if (provider === "vimeo")
    return url.pathname.match(/^\/(?:video\/)?(\d+)/)?.[1] ?? null;
  return youtubeId(url);
};

const wholeSeconds = (value: number | undefined): number =>
  value && value > 0 ? Math.floor(value) : 0;

const youtubeSrc = (id: string, options: EmbedOptions): string => {
  const query = new URLSearchParams({ enablejsapi: "1" });
  if (options.origin) query.set("origin", options.origin);
  if (options.autoplay) query.set("autoplay", "1");
  const start = wholeSeconds(options.startAt);
  if (start) query.set("start", String(start));
  return `https://www.youtube.com/embed/${id}?${query.toString()}`;
};

const vimeoSrc = (id: string, options: EmbedOptions): string => {
  const query = options.autoplay ? "?autoplay=1" : "";
  const start = wholeSeconds(options.startAt);
  return `https://player.vimeo.com/video/${id}${query}${start ? `#t=${start}s` : ""}`;
};

export const videoEmbedOf = (
  link: string,
  options: EmbedOptions = {},
): VideoEmbed | null => {
  const url = parse(link);
  if (!url) return null;
  const provider = providerOf(url);
  const id = provider && idOf(provider, url);
  if (!provider || !id) return null;
  if (provider === "drive")
    return { provider, src: `https://drive.google.com/file/d/${id}/preview` };
  if (provider === "vimeo") return { provider, src: vimeoSrc(id, options) };
  return { provider, src: youtubeSrc(id, options) };
};

export const isVideoLink = (link: string): boolean =>
  videoEmbedOf(link) !== null;

// Μόνο YouTube και Vimeo λένε τον χρόνο του βίντεο.
export const tracksTime = (provider: VideoProvider): boolean =>
  provider !== "drive";

// Τα μηνύματα που ζητούν από τον player να στέλνει τον χρόνο του.
export const listenMessages = (provider: VideoProvider): string[] => {
  if (provider === "youtube")
    return [JSON.stringify({ event: "listening", id: 1, channel: "widget" })];
  if (provider === "vimeo")
    return [
      JSON.stringify({ method: "addEventListener", value: "timeupdate" }),
    ];
  return [];
};

// Τα μηνύματα «πήγαινε στο δευτερόλεπτο s και παίξε».
export const seekMessages = (
  provider: VideoProvider,
  seconds: number,
): string[] => {
  const at = Math.max(0, seconds);
  if (provider === "youtube")
    return [
      JSON.stringify({ event: "command", func: "seekTo", args: [at, true] }),
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
    ];
  if (provider === "vimeo")
    return [
      JSON.stringify({ method: "setCurrentTime", value: at }),
      JSON.stringify({ method: "play" }),
    ];
  return [];
};

const parseData = (data: unknown): unknown => {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// Ο χρόνος από ένα μήνυμα του player (null αν το μήνυμα δεν λέει χρόνο).
export const timeFromMessage = (
  provider: VideoProvider,
  data: unknown,
): number | null => {
  const message = parseData(data);
  if (!isRecord(message)) return null;
  if (
    provider === "youtube" &&
    message.event === "infoDelivery" &&
    isRecord(message.info)
  )
    return numberOrNull(message.info.currentTime);
  if (
    provider === "vimeo" &&
    message.event === "timeupdate" &&
    isRecord(message.data)
  )
    return numberOrNull(message.data.seconds);
  return null;
};

// Το Vimeo λέει «ready» όταν μπορεί να ακούσει· τότε ξαναστέλνουμε το «στείλε μου τον χρόνο».
export const isReadyMessage = (
  provider: VideoProvider,
  data: unknown,
): boolean => {
  const message = parseData(data);
  return isRecord(message) && provider === "vimeo" && message.event === "ready";
};
