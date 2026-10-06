import { NOW } from "@/data/filming";
import type {
  Attachment,
  Message,
  MessageRequest,
  RequestClosing,
  RequestState,
} from "@/data/messages";

export type J2Filter = "all" | "untagged" | "internal";

export const parseFilter = (value: string | undefined): J2Filter =>
  value === "untagged" || value === "internal" ? value : "all";

export const applyFilter = (
  messages: readonly Message[],
  filter: J2Filter,
): readonly Message[] =>
  messages.filter((m) =>
    filter === "untagged"
      ? !m.productionId
      : filter === "internal"
        ? !!m.isInternal
        : true,
  );

export const patchMessage = (
  list: readonly Message[],
  id: string,
  patch: Partial<Message>,
): readonly Message[] =>
  list.map((m) => (m.id === id ? { ...m, ...patch } : m));

export const withRequest = (
  message: Message,
  patch: Partial<MessageRequest>,
): Message =>
  message.request
    ? { ...message, request: { ...message.request, ...patch } }
    : message;

export const closeWith = (
  message: Message,
  state: RequestState,
  closing: Omit<RequestClosing, "when">,
): Message =>
  withRequest(message, { state, closing: { ...closing, when: NOW } });

export interface FakeFile extends Attachment {
  label: string;
}

export const FAKE_FILES: readonly FakeFile[] = [
  {
    label: "Φωτογραφία μενού (2 MB)",
    name: "menu-foto.jpg",
    kind: "εικόνα",
    sizeKb: 2048,
  },
  { label: "Οδηγίες (350 KB)", name: "odigies.pdf", kind: "PDF", sizeKb: 350 },
  { label: "Brief (120 KB)", name: "brief.docx", kind: "έγγραφο", sizeKb: 120 },
  {
    label: "Βίντεο γυρίσματος (24 MB)",
    name: "gyrisma-raw.mp4",
    kind: "έγγραφο",
    sizeKb: 24576,
  },
];
