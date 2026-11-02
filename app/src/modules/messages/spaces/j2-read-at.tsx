"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { Badge } from "@/spaces/screens/shared";

// Ο δείκτης ανάγνωσης της ΠΡΩΤΗΣ απόδοσης κρατιέται όσο μένει ανοιχτή η σελίδα: η ανανέωση των 20″ δεν σβήνει τα «νέο».
const ReadAtContext = createContext<string | null>(null);

export function ReadAtScope({
  readAt,
  children,
}: {
  readAt: string | null;
  children: ReactNode;
}) {
  const [firstReadAt] = useState(readAt);
  return (
    <ReadAtContext.Provider value={firstReadAt}>
      {children}
    </ReadAtContext.Provider>
  );
}

// «νέο»: Μήνυμα άλλου, όχι διαγραμμένο, νεότερο από τον δείκτη ανάγνωσης (ή χωρίς δείκτη).
export function NewBadge({ at, canBeNew }: { at: string; canBeNew: boolean }) {
  const readAt = useContext(ReadAtContext);
  if (!canBeNew) return null;
  if (readAt !== null && Date.parse(at) <= Date.parse(readAt)) return null;
  return <Badge tone="strong">νέο</Badge>;
}
