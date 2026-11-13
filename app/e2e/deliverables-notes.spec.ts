import { expect, test } from "@playwright/test";

import {
  DELIVERABLE_URL,
  addTeamComment,
  addVersion,
  createDeliverable,
  createInternalProduction,
  deliverablesPanel,
  versionsPanel,
} from "./deliverables-parts";
import { visit } from "./filming-parts";
import { button, project, shot, signIn } from "./sales-parts";

// Σημειώσεις πάνω στο βίντεο (H2) και «Μόνο εμένα / Όλη η ομάδα» (H1), στη νέα εμφάνιση (Χώροι). Ο player δεν
// ξεκινά ποτέ (θα φόρτωνε το YouTube)· ελέγχουμε ότι υπάρχει και ότι ο χρόνος της σημείωσης είναι κουμπί προς αυτόν.
// Σειριακά και χωρίς retries, όπως τα άλλα e2e (η βάση μοιράζεται).
test.describe.configure({ retries: 0 });

const LINK = "https://youtu.be/dQw4w9WgXcQ";
const NOTE = "Το λογότυπο μπαίνει νωρίς";
const REPLY = "Το μετακινώ δύο δευτερόλεπτα";
const TIMECODE = "0:42";

test("η ομάδα σημειώνει πάνω στο βίντεο, απαντά, το λύνει και το βλέπει όπως ο πελάτης", async ({
  page,
}) => {
  const P = project();
  const DELIVERABLE = `Σημειώσεις ${P}`;

  await signIn(page, "owner@example.com");
  await createInternalProduction(page, `Βίντεο ${P}`);
  await createDeliverable(page, DELIVERABLE);
  await deliverablesPanel(page)
    .getByRole("link", { name: DELIVERABLE, exact: true })
    .click();
  await expect(page).toHaveURL(DELIVERABLE_URL);
  await addVersion(page, LINK, {
    version: 1,
    state: "αναμένει εσωτερικό έλεγχο",
  });

  // 1. Ο player της Έκδοσης και η σημείωση με χρόνο: ο χρόνος πηγαίνει το βίντεο εκεί.
  const versions = versionsPanel(page);
  await expect(
    versions.getByRole("button", { name: /^Παίξε το βίντεο:/ }),
  ).toBeVisible();
  await addTeamComment(page, { body: NOTE, timecode: TIMECODE });
  await expect(
    versions.getByRole("button", {
      name: `Πήγαινε το βίντεο στο ${TIMECODE}`,
    }),
  ).toBeVisible();

  // 2. Απάντηση στο νήμα.
  await button(versions, "Απάντηση").click();
  const reply = versions.locator("form.vn-reply");
  await reply.getByLabel("Απάντηση").fill(REPLY);
  await button(reply, "Στείλε την απάντηση").click();
  await expect(
    versions.getByRole("list", { name: "Απαντήσεις" }),
  ).toContainText(REPLY);

  // 3. «Λύθηκε» και ξανά ανοιχτό.
  await button(versions, "Λύθηκε").click();
  await expect(versions.getByText(/^λύθηκε · /)).toBeVisible();
  await button(versions, "Ξανάνοιξέ το").click();
  await expect(button(versions, "Λύθηκε")).toBeVisible();
  await shot(page, "h2-video-notes");

  // 4. «Δες το όπως ο πελάτης»: η Έκδοση δεν έχει σταλεί, άρα ο πελάτης δεν βλέπει τίποτα ακόμα.
  await button(versions, "Δες το όπως ο πελάτης").click();
  await expect(
    versions.getByText("Ο πελάτης δεν βλέπει ακόμα καμία Έκδοση"),
  ).toBeVisible();
  await expect(versions.getByText(NOTE)).toHaveCount(0);
  await button(versions, "Όπως η ομάδα").click();
  await expect(versions.getByText(NOTE)).toBeVisible();
});

test("η ουρά Παραδοτέων δείχνει «Μόνο εμένα» ή «Όλη η ομάδα» και το κρατά στη διεύθυνση", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await visit(page, "/app/deliverables");
  const who = page.getByRole("navigation", { name: "Ποιανού" });
  await expect(who.getByRole("link", { name: /^Όλη η ομάδα/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await who.getByRole("link", { name: /^Μόνο εμένα/ }).click();
  await expect(page).toHaveURL(/[?&]who=me/);
  await expect(who.getByRole("link", { name: /^Μόνο εμένα/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await shot(page, "h1-only-me");
  await who.getByRole("link", { name: /^Όλη η ομάδα/ }).click();
  await expect(page).not.toHaveURL(/who=me/);
});
