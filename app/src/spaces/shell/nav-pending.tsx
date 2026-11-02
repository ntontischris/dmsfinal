"use client";

import { useLinkStatus } from "next/link";

// Μέσα σε κάθε Link των Χώρων: λέει στο CSS ότι το πάτημα έπιασε, πριν φτάσει η νέα σελίδα.
export function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span className="nav-pending" data-pending={pending} aria-hidden="true" />
  );
}
