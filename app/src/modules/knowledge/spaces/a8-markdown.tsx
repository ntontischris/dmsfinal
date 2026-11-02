import Link from "next/link";
import Markdown, { type Components } from "react-markdown";

import { isExternalLink, safeImageUrl, safeLinkUrl } from "../markdown-urls";

import "./a8.css";

// Το κείμενο ενός Άρθρου στη νέα εμφάνιση: παράγραφοι μέσα στο `.a8-body` του prototype. Ίδιοι κανόνες ασφαλείας με το
// MarkdownBody: όχι ωμή HTML, σύνδεσμοι μόνο https ή /app/…, εικόνες μόνο από τη Γνώση.

const urlTransform = (url: string, key: string): string =>
  key === "src" ? safeImageUrl(url) : safeLinkUrl(url);

const COMPONENTS: Components = {
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
