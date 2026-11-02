// Από το link της Έκδοσης στη διεύθυνση του player, ώστε το βίντεο να παίζει μέσα στην εφαρμογή.

const parse = (link: string): URL | null => {
  try {
    return new URL(link.trim());
  } catch {
    return null;
  }
};

const driveEmbed = (url: URL): string | null => {
  const id = url.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1];
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
};

const vimeoEmbed = (url: URL): string | null => {
  const id = url.pathname.match(/^\/(?:video\/)?(\d+)/)?.[1];
  return id ? `https://player.vimeo.com/video/${id}` : null;
};

const youtubeEmbed = (url: URL): string | null => {
  const id =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.searchParams.get("v");
  return id ? `https://www.youtube.com/embed/${id}` : null;
};

export const embedUrlOf = (link: string): string | null => {
  const url = parse(link);
  if (!url) return null;
  if (url.hostname === "drive.google.com") return driveEmbed(url);
  if (url.hostname.endsWith("vimeo.com")) return vimeoEmbed(url);
  if (["youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname))
    return youtubeEmbed(url);
  return null;
};
