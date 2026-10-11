import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { MESSAGES_PATH } from "../helpers";
import {
  BACK_TO_INBOX,
  CLIENT_STATUS,
  MANAGER_LABEL,
  NO_MANAGER,
  STATUS_LABEL,
} from "../labels";
import type { Thread } from "../view-schema";

interface ThreadHeaderProps {
  client: Thread["client"];
  clientHref?: string;
}

// Κεφαλίδα της Συνομιλίας: Πελάτης (με σύνδεσμο στην καρτέλα του αν επιτρέπεται), Υπεύθυνος, κατάσταση.
export function ThreadHeader({ client, clientHref }: ThreadHeaderProps) {
  return (
    <section className="mb-4 grid gap-2 rounded-md border bg-card px-4 py-3">
      <h2 className="m-0 text-lg font-semibold">
        Συνομιλία:{" "}
        {clientHref ? (
          <Link href={clientHref}>{client.name}</Link>
        ) : (
          client.name
        )}
      </h2>
      <p className="m-0 text-sm text-muted-foreground">
        {MANAGER_LABEL}: {client.managerName ?? NO_MANAGER} · {STATUS_LABEL}:{" "}
        {CLIENT_STATUS[client.status] ?? client.status}
      </p>
      <div>
        <Link className={buttonVariants({ size: "sm" })} href={MESSAGES_PATH}>
          {BACK_TO_INBOX}
        </Link>
      </div>
    </section>
  );
}
