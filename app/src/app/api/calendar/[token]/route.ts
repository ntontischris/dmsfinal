import { buildCalendarIcs, getCalendarFeed } from "@/modules/calendar";

// Το αρχείο .ics του Συνδέσμου ημερολογίου (μόνο ανάγνωση). Χωρίς συνεδρία· το token είναι η άδεια.
// Το token μπαίνει στη διαδρομή ως «<token>.ics». Ό,τι δεν είναι έγκυρο δείχνει 404 χωρίς να ρωτήσει τη βάση.

// 32 τυχαία bytes ως base64url, χωρίς «=»: 43 χαρακτήρες (βλ. authz.new_calendar_token).
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;
const SUFFIX = /\.ics$/;

const plainText = (message: string, status: number): Response =>
  new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const bare = token.replace(SUFFIX, "");
  if (!TOKEN_SHAPE.test(bare)) return plainText("Ο σύνδεσμος δεν ισχύει.", 404);

  const feed = await getCalendarFeed(bare);
  if (!feed.ok)
    return plainText("Το ημερολόγιο δεν είναι διαθέσιμο αυτή τη στιγμή.", 503);
  if (feed.data === null) return plainText("Ο σύνδεσμος δεν ισχύει.", 404);

  return new Response(buildCalendarIcs(feed.data), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
