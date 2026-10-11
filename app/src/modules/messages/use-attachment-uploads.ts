"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MESSAGE_ATTACHMENT_BUCKET } from "@/lib/messages/attachment-bucket";

import {
  requestAttachmentUploads,
  type UploadConnection,
  type UploadSlot,
} from "./actions-attachments";
import { firstAttachmentError } from "./attachment-rules";

// Το ανέβασμα συνημμένων από τον browser (Μ7): ο server δίνει θέσεις και signed upload URLs, το αρχείο πάει απευθείας
// στο Storage, και ο συντάκτης στέλνει στο Μήνυμα μόνο τις διαδρομές. Ίδιος μηχανισμός για την ομάδα και τον πελάτη.

export type UploadStatus = "uploading" | "ready" | "failed";

export interface UploadItem {
  key: string;
  name: string;
  size: number;
  status: UploadStatus;
  path: string | null;
}

export interface AttachmentTarget {
  clientId: string;
  productionId: string | null;
}

export interface AttachmentUploads {
  items: readonly UploadItem[];
  paths: readonly string[];
  isUploading: boolean;
  error: string | null;
  add: (files: readonly File[], target: AttachmentTarget) => Promise<void>;
  remove: (key: string) => void;
  reset: () => void;
}

const UPLOAD_FAILED_TEXT = "Το αρχείο δεν ανέβηκε. Δοκίμασε ξανά.";

async function uploadOne(
  connection: UploadConnection,
  slot: UploadSlot,
  file: File,
): Promise<boolean> {
  const client = createClient(connection.url, connection.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await client.storage
    .from(MESSAGE_ATTACHMENT_BUCKET)
    .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type });
  return error === null;
}

const itemOf = (file: File): UploadItem => ({
  key: crypto.randomUUID(),
  name: file.name,
  size: file.size,
  status: "uploading",
  path: null,
});

export function useAttachmentUploads(): AttachmentUploads {
  const [items, setItems] = useState<readonly UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const countRef = useRef(0);
  useEffect(() => {
    countRef.current = items.length;
  }, [items]);

  const patch = useCallback((key: string, change: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  }, []);

  const drop = useCallback((keys: readonly string[]) => {
    setItems((current) => current.filter((item) => !keys.includes(item.key)));
  }, []);

  const add = useCallback(
    async (files: readonly File[], target: AttachmentTarget) => {
      const problem = firstAttachmentError(countRef.current, files);
      if (problem !== null) {
        setError(problem);
        return;
      }
      setError(null);
      const added = files.map(itemOf);
      setItems((current) => [...current, ...added]);
      const request = await requestAttachmentUploads({
        ...target,
        files: files.map((file) => ({
          name: file.name,
          mime: file.type,
          size: file.size,
        })),
      });
      if (!request.ok) {
        drop(added.map((item) => item.key));
        setError(request.error);
        return;
      }
      const outcomes = await Promise.all(
        added.map(async (item, index) => {
          const slot = request.slots[index];
          const file = files[index];
          const isUploaded =
            slot !== undefined &&
            file !== undefined &&
            (await uploadOne(request.connection, slot, file));
          patch(item.key, {
            status: isUploaded ? "ready" : "failed",
            path: isUploaded ? slot.path : null,
          });
          return isUploaded;
        }),
      );
      if (outcomes.includes(false)) setError(UPLOAD_FAILED_TEXT);
    },
    [drop, patch],
  );

  const remove = useCallback((key: string) => drop([key]), [drop]);

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
  }, []);

  return useMemo(
    () => ({
      items,
      paths: items.flatMap((item) =>
        item.status === "ready" && item.path !== null ? [item.path] : [],
      ),
      isUploading: items.some((item) => item.status === "uploading"),
      error,
      add,
      remove,
      reset,
    }),
    [items, error, add, remove, reset],
  );
}
