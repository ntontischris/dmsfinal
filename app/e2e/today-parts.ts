import { expect, type Locator, type Page } from "@playwright/test";

// Βοηθητικά των e2e της «Σήμερα» (A1) στη νέα εμφάνιση (Χώροι).

// Κουμπί που ανοίγει κάτι στον browser: πάτημα πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναπατάμε όσο δεν άνοιξε.
export async function clickUntil(button: Locator, opened: Locator) {
  await expect(async () => {
    if (!(await opened.isVisible())) await button.click();
    await expect(opened).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

// Οι κλειστές ζώνες της Σήμερα (ενημέρωση, «Και άλλα») ανοίγουν, ώστε να φαίνονται οι κάρτες τους.
export async function openFolds(page: Page) {
  await page
    .locator("details")
    .evaluateAll((folds) =>
      folds.forEach((fold) => fold.setAttribute("open", "")),
    );
}

// Το «Όλα →» μιας κάρτας: πηγαίνει στη λίστα πίσω της (π.χ. «Όλα: Τα ανοιχτά Αιτήματά σου»).
export const allLink = (card: Locator, title: string) =>
  card.getByRole("link", { name: new RegExp(`^Όλα( \\(\\d+\\))?: ${title}$`) });
