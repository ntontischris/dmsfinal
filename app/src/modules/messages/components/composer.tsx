"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

import { sendMessage } from "../actions";
import {
  COMPOSER_INTERNAL,
  COMPOSER_INTERNAL_WARNING,
  COMPOSER_LABEL,
  COMPOSER_MENTION,
  COMPOSER_MENTION_HINT,
  COMPOSER_PLACEHOLDER,
  COMPOSER_RECIPIENT,
  COMPOSER_REMOVE_MENTION,
  COMPOSER_SEND,
  COMPOSER_SENDING,
  COMPOSER_TAG,
  COMPOSER_TO_CLIENT,
  NO_TAG,
  editWindowNote,
} from "../labels";
import type { ThreadProduction, WritableClient } from "../view-schema";
import { useAttachmentUploads } from "../use-attachment-uploads";
import { ActionForm } from "./action-form";
import { AttachmentPicker } from "./attachment-picker";

interface ComposerProps {
  clientId: string;
  productions: readonly ThreadProduction[];
  canWriteUntagged: boolean;
  mentionable: readonly WritableClient[];
  defaultProduction?: string;
  editMinutes: number;
}

// Η ετικέτα που προεπιλέγεται: αυτή του ?production= αν επιτρέπεται, αλλιώς καμία (ή η πρώτη όταν δεν επιτρέπεται καμία).
const defaultTagOf = (
  productions: readonly ThreadProduction[],
  canWriteUntagged: boolean,
  wanted: string | undefined,
): string => {
  if (wanted !== undefined && productions.some((p) => p.id === wanted))
    return wanted;
  return canWriteUntagged ? "" : (productions[0]?.id ?? "");
};

// Ο συντάκτης: «Προς πελάτη» ή «Εσωτερικό Μήνυμα» (με προειδοποίηση και αναφορές), ετικέτα, αποστολή. Με συνημμένα (Jγ): ανεβαίνουν απευθείας στο Storage και στέλνονται οι διαδρομές τους.
export function Composer({
  clientId,
  productions,
  canWriteUntagged,
  mentionable,
  defaultProduction,
  editMinutes,
}: ComposerProps) {
  const router = useRouter();
  const initialTag = defaultTagOf(productions, canWriteUntagged, defaultProduction);
  const uploads = useAttachmentUploads();
  const resetUploads = uploads.reset;
  const [tag, setTag] = useState(initialTag);
  const [isInternal, setInternal] = useState(false);
  const [mentions, setMentions] = useState<readonly string[]>([]);

  // Μετά από κάθε αποστολή: καθαρίζει τον συντάκτη και ανανεώνει τη Συνομιλία αμέσως (Μ2).
  const handleSent = useCallback(() => {
    setInternal(false);
    setMentions([]);
    setTag(initialTag);
    resetUploads();
    router.refresh();
  }, [router, initialTag, resetUploads]);

  const addMention = (id: string) => {
    if (id !== "" && !mentions.includes(id)) setMentions([...mentions, id]);
  };
  const nameOf = (id: string): string =>
    mentionable.find((person) => person.id === id)?.name ?? id;

  return (
    <section
      aria-label={COMPOSER_LABEL}
      className={cn(
        "rounded-md border bg-card p-4",
        isInternal && "border-dashed border-primary/60",
      )}
    >
      <ActionForm
        action={sendMessage}
        submitLabel={COMPOSER_SEND}
        pendingLabel={COMPOSER_SENDING}
        resetOnSuccess
        isDisabled={uploads.isUploading}
        onSuccess={handleSent}
      >
        <input type="hidden" name="clientId" value={clientId} />
        {isInternal && <input type="hidden" name="internal" value="on" />}
        {isInternal &&
          mentions.map((id) => (
            <input key={id} type="hidden" name="mentions" value={id} />
          ))}
        <div
          role="group"
          aria-label={COMPOSER_RECIPIENT}
          className="flex flex-wrap gap-2"
        >
          <Button
            size="sm"
            variant={isInternal ? "default" : "primary"}
            aria-pressed={!isInternal}
            onClick={() => setInternal(false)}
          >
            {COMPOSER_TO_CLIENT}
          </Button>
          <Button
            size="sm"
            variant={isInternal ? "primary" : "default"}
            aria-pressed={isInternal}
            onClick={() => setInternal(true)}
          >
            {COMPOSER_INTERNAL}
          </Button>
        </div>
        {isInternal && (
          <strong className="text-sm text-primary">
            {COMPOSER_INTERNAL_WARNING}
          </strong>
        )}
        <label className="grid max-w-md gap-1.5">
          <span className="kit-label">{COMPOSER_TAG}</span>
          <Select
            name="productionId"
            defaultValue={initialTag}
            onChange={(event) => setTag(event.target.value)}
          >
            {canWriteUntagged && <option value="">{NO_TAG}</option>}
            {productions.map((production) => (
              <option key={production.id} value={production.id}>
                {production.title}
              </option>
            ))}
          </Select>
        </label>
        <textarea
          name="body"
          aria-label={COMPOSER_LABEL}
          placeholder={COMPOSER_PLACEHOLDER}
          maxLength={4000}
          required={uploads.paths.length === 0}
          rows={4}
          className="w-full rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:border-border-strong focus:border-primary focus:outline-none"
        />
        <AttachmentPicker
          uploads={uploads}
          clientId={clientId}
          productionId={tag === "" ? null : tag}
        />
        {mentionable.length > 0 && (
          <div className="grid gap-2">
            <Select
              aria-label={COMPOSER_MENTION}
              className="max-w-xs"
              disabled={!isInternal}
              value=""
              onChange={(event) => addMention(event.target.value)}
            >
              <option value="">{COMPOSER_MENTION}</option>
              {mentionable.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
            {!isInternal && (
              <p className="m-0 text-sm text-muted-foreground">
                {COMPOSER_MENTION_HINT}
              </p>
            )}
            {mentions.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {mentions.map((id) => (
                  <li
                    key={id}
                    className="flex items-center gap-1 rounded-sm border px-2 text-sm"
                  >
                    @{nameOf(id)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setMentions(mentions.filter((entry) => entry !== id))
                      }
                    >
                      {COMPOSER_REMOVE_MENTION}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <p className="m-0 text-sm text-muted-foreground">
          {editWindowNote(editMinutes)}
        </p>
      </ActionForm>
    </section>
  );
}
