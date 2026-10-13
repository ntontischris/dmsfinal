import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type { ReplyWrite, UnansweredWrite } from "./pipeline";

// Οι εγγραφές που κάνει ΜΟΝΟ ο server του Βοηθού (service_role, #192): η απάντηση και η Αναπάντητη. Ο Χρήστης (p_user) είναι
// αυτός που επαλήθευσε ο server με getUser(), ποτέ τιμή από το αίτημα· η βάση ξαναελέγχει ότι η Συζήτηση είναι δική του.
// Αποτυχία: γράφεται στα logs και η απάντηση στον Χρήστη δεν κόβεται.

export async function writeReply(
  userId: string,
  write: ReplyWrite,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin)
    return console.error("assistant_reply_append", "service role missing");
  const { error } = await admin.rpc("assistant_reply_append", {
    p_user: userId,
    p_conversation: write.conversationId,
    p_content: write.content,
    p_sources: write.sources,
    p_no_source: write.noSource,
  });
  if (error) console.error("assistant_reply_append", error.message);
}

export async function writeUnanswered(
  userId: string,
  write: UnansweredWrite,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin)
    return console.error("assistant_unanswered_record", "service role missing");
  const { error } = await admin.rpc("assistant_unanswered_record", {
    p_user: userId,
    p_conversation: write.conversationId,
    p_message: write.messageId,
    p_question: write.question,
    p_embedding: JSON.stringify(write.embedding),
  });
  if (error) console.error("assistant_unanswered_record", error.message);
}
