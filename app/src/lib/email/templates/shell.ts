import type { Locale } from "../locale";

// Το κέλυφος όλων των μηνυμάτων: ένα κουμπί, λίγες παράγραφοι, λογότυπο. Απλό HTML με inline στυλ.
export interface ShellInput {
  locale: Locale;
  origin: string;
  heading: string;
  paragraphs: readonly string[];
  action?: { label: string; url: string };
}

export interface RenderedBody {
  html: string;
  text: string;
}

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const paragraphHtml = (text: string): string =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#1f1f1f;">${escapeHtml(text)}</p>`;

const buttonHtml = (label: string, url: string): string =>
  `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#e0a526;color:#111;text-decoration:none;border-radius:4px;font-weight:600;">${escapeHtml(label)}</a></p>`;

const footerText = (locale: Locale): string =>
  locale === "en"
    ? "Devre Media · This message was sent by the company system."
    : "Devre Media · Το μήνυμα στάλθηκε από το σύστημα της εταιρείας.";

export function renderShell(input: ShellInput): RenderedBody {
  const logo = `${input.origin}/logo-email.png`;
  const html = [
    `<!doctype html><html lang="${input.locale}"><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;">`,
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:6px;padding:32px;">`,
    `<img src="${escapeHtml(logo)}" alt="Devre Media" width="140" style="display:block;margin:0 0 24px;" />`,
    `<h1 style="margin:0 0 16px;font-size:22px;color:#111;">${escapeHtml(input.heading)}</h1>`,
    ...input.paragraphs.map(paragraphHtml),
    input.action ? buttonHtml(input.action.label, input.action.url) : "",
    `<p style="margin:24px 0 0;font-size:12px;color:#6b6b6b;">${escapeHtml(footerText(input.locale))}</p>`,
    `</div></body></html>`,
  ].join("");
  const text = [
    input.heading,
    "",
    ...input.paragraphs,
    ...(input.action ? ["", `${input.action.label}: ${input.action.url}`] : []),
    "",
    footerText(input.locale),
  ].join("\n");
  return { html, text };
}
