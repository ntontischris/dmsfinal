import Link from "next/link";

import { Blocks } from "@/kit/showcase-blocks";
import { Controls } from "@/kit/showcase-controls";
import { Foundations } from "@/kit/showcase-foundations";

import "@/kit/showcase.css";

// /kit: το κοινό σύστημα Ιστοσελίδας και εφαρμογής, με αρχές, tokens και κάθε component σε ζωντανό δείγμα.

const APPLIED: readonly {
  href: string;
  code: string;
  title: string;
  shows: string;
}[] = [
  {
    href: "/visitor/R1",
    code: "R1",
    title: "Αρχική",
    shows: "το θέαμα: αίθουσα μοντάζ",
  },
  {
    href: "/owner/A1",
    code: "A1",
    title: "Σήμερα",
    shows: "δείκτες, πάνελ, timeline εβδομάδας",
  },
  {
    href: "/owner/B2?id=kypseli",
    code: "B2",
    title: "Σελίδα Πελάτη",
    shows: "πλαϊνή στήλη ιδιοτήτων, γραμμές λίστας",
  },
  {
    href: "/owner/I2",
    code: "I2",
    title: "Τιμολόγια",
    shows: "δείκτες, φίλτρα, πίνακας, σήματα",
  },
];

const SECTIONS: readonly [string, string][] = [
  ["principles", "Αρχές"],
  ["colors", "Χρώματα"],
  ["type", "Τυπογραφία"],
  ["buttons", "Κουμπιά"],
  ["fields", "Πεδία"],
  ["filters", "Φίλτρα"],
  ["tabs", "Καρτέλες"],
  ["badges", "Σήματα"],
  ["stats", "Δείκτες"],
  ["panel", "Πάνελ"],
  ["rows", "Λίστες"],
  ["table", "Πίνακας"],
  ["inspector", "Πλαϊνή στήλη"],
  ["timeline", "Timeline"],
  ["steps", "Βήματα"],
  ["states", "Καταστάσεις"],
];

interface KitPageProps {
  searchParams: Promise<{ f?: string }>;
}

export default async function KitPage({ searchParams }: KitPageProps) {
  const { f } = await searchParams;
  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">Kit · Οπτική κατεύθυνση · «Μοντάζ»</p>
        <h1>Ένα σύστημα, μέσα κι έξω</h1>
        <p className="muted kit-lead">
          Σκελετός από το «Μοντάζ», με λίστες από το «Φως», πίνακες και δείκτες
          από το «Τεχνικό δελτίο», φίλτρα και βήματα από τη «Χρωματική
          διόρθωση», σήματα από το «Ρεζί». Η Ιστοσελίδα κάνει το θέαμα· η
          εφαρμογή είναι ήσυχη, με τα ίδια tokens.
        </p>
      </header>
      <section className="kit-applied" aria-label="Εφαρμοσμένο σε οθόνες">
        {APPLIED.map((a) => (
          <Link key={a.code} className="kit-stat" href={a.href}>
            <span className="kit-label">{a.code}</span>
            <span className="kit-applied-title">{a.title} →</span>
            <span className="kit-stat-hint">{a.shows}</span>
          </Link>
        ))}
      </section>
      <nav className="kit-toc" aria-label="Περιεχόμενα">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <Foundations />
      <Controls filter={f ?? "open"} />
      <Blocks />
    </>
  );
}
