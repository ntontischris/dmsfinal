import Link from "next/link";
import Markdown, { type Components } from "react-markdown";

import { isExternalLink, safeImageUrl, safeLinkUrl } from "../markdown-urls";

// Το κείμενο ενός Άρθρου. Το react-markdown δεν αποδίδει ωμή HTML (skipHtml: αγνοείται)· οι σύνδεσμοι περνούν από το
// safeLinkUrl (https ή /app/…) και οι εικόνες μόνο από τη Γνώση (safeImageUrl). Ό,τι άλλο γίνεται απλό κείμενο.

const urlTransform = (url: string, key: string): string =>
  key === "src" ? safeImageUrl(url) : safeLinkUrl(url);

const COMPONENTS: Components = {
  h1: ({ children }) => (
    <h2 className="mt-6 mb-2 text-xl font-semibold">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-5 mb-2 text-lg font-semibold">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-4 mb-2 text-base font-semibold">{children}</h4>
  ),
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal pl-6">{children}</ol>,
  li: ({ children }) => <li className="my-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-border-strong pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded-sm bg-muted px-1 text-sm">{children}</code>
  ),
  a: ({ href, children }) => {
    if (!href) return <span>{children}</span>;
    if (isExternalLink(href))
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-primary underline"
        >
          {children}
        </a>
      );
    return (
      <Link href={href} className="text-primary underline">
        {children}
      </Link>
    );
  },
  img: ({ src, alt }) =>
    typeof src === "string" && src !== "" ? (
      // Η εικόνα έρχεται από route που ελέγχει ορατότητα και κάνει redirect σε signed URL 60″· το next/image δεν ταιριάζει.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        className="my-3 h-auto max-w-full rounded-md border"
      />
    ) : null,
};

export function MarkdownBody({ source }: { source: string }) {
  return (
    <div className="max-w-prose text-[0.95rem]">
      <Markdown skipHtml urlTransform={urlTransform} components={COMPONENTS}>
        {source}
      </Markdown>
    </div>
  );
}
