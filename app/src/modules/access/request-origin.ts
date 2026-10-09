import { headers } from "next/headers";

// Η διεύθυνση της εφαρμογής όπως τη βλέπει ο Χρήστης (πίσω από το Vercel: x-forwarded-*).
export async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
