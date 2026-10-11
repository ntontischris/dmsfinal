"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { isNewMessage } from "../helpers";
import { MESSAGE_NEW } from "../labels";
import type { ThreadMessage } from "../view-schema";

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

export function NewMark({ message }: { message: ThreadMessage }) {
  const readAt = useContext(ReadAtContext);
  if (!isNewMessage(message, readAt)) return null;
  return <Badge tone="strong">{MESSAGE_NEW}</Badge>;
}
