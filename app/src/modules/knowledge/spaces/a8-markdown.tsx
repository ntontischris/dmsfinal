import Link from "next/link";
import Markdown, { type Components, type ExtraProps } from "react-markdown";

import { isVideoLink } from "@/lib/video-embed";
import { VideoPlayer } from "@/spaces/kit/video-player";

import { isExternalLink, safeImageUrl, safeLinkUrl } from "../markdown-urls";

import "./a8.css";

// Το κείμενο ενός Άρθρου στη νέα εμφάνιση: παράγραφοι μέσα στο `.a8-body` του prototype. Ίδιοι κανόνες ασφαλείας με το
// MarkdownBody (και βίντεο σε δική τους γραμμή): όχι ωμή HTML, σύνδεσμοι μόνο https ή /app/…, εικόνες μόνο από τη Γνώση.

const urlTransform = (url: string, key: string): string =>
  key === "src" ? safeImageUrl(url) : safeLinkUrl(url);

type Hast = NonNullable<ExtraProps["node"]>;

// Παράγραφος που είναι μόνο ένας σύνδεσμος βίντεο (YouTube, Vimeo, Drive): το link και το κείμενό του.
const videoOf = (
  node: Hast | undefined,
): { link: string; title: string } | null => {
  const only = node?.children.length === 1 ? node.children[0] : undefined;
  if (only?.type === "text" && isVideoLink(only.value))
    return { link: only.value.trim(), title: "Βίντεο" };
  if (only?.type !== "element" || only.tagName !== "a") return null;
  const href = only.properties.href;
  if (typeof href !== "string" || !isVideoLink(href)) return null;
  const text = only.children
    .map((c) => (c.type === "text" ? c.value : ""))
    .join("");
  return { link: href, title: text.trim() || "Βίντεο" };
};

const COMPONENTS: Components = {
  // Ένα link βίντεο σε δική του γραμμή παίζει μέσα στο Άρθρο, με τον ίδιο player με τα Παραδοτέα.
  p: ({ node, children }) => {
    const video = videoOf(node);
    if (!video) return <p>{children}</p>;
    return (
      <figure className="a8-video">
        <VideoPlayer link={video.link} title={video.title} />
        {video.title !== "Βίντεο" && (
          <figcaption className="muted">{video.title}</figcaption>
        )}
      </figure>
    );
  },
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h3>{children}</h3>,
  h3: ({ children }) => <h4>{children}</h4>,
  a: ({ href, children }) => {
    if (!href) return <span>{children}</span>;
    if (isExternalLink(href))
      return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow">
          {children}
        </a>
      );
    return <Link href={href}>{children}</Link>;
  },
  img: ({ src, alt }) =>
    typeof src === "string" && src !== "" ? (
      // Η εικόνα έρχεται από route που ελέγχει ορατότητα και κάνει redirect σε signed URL 60″· το next/image δεν ταιριάζει.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} loading="lazy" />
    ) : null,
};

export function ArticleBody({ source }: { source: string }) {
  return (
    <div className="a8-body">
      <Markdown skipHtml urlTransform={urlTransform} components={COMPONENTS}>
        {source}
      </Markdown>
    </div>
  );
}
