import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

// Προσωρινή αρχική. Η Ιστοσελίδα (R1–R13) χτίζεται στο τέλος του v1· ως τότε η αρχική οδηγεί στο σύστημα.
export default function HomePage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="grid max-w-lg justify-items-start gap-4">
        <p className="kit-label m-0 inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]"
          />
          DMS · σε ανάπτυξη
        </p>
        <h1 className="m-0 text-[clamp(2rem,1.4rem+3vw,3.4rem)] leading-none font-semibold tracking-tight">
          Η νέα πλατφόρμα χτίζεται.
        </h1>
        <p className="m-0 text-muted-foreground">
          Η Ιστοσελίδα έρχεται στο τέλος. Ως τότε, από εδώ περνάς στο σύστημα.
        </p>
        <Link href="/app" className={buttonVariants({ variant: "primary" })}>
          Στο σύστημα →
        </Link>
      </div>
    </main>
  );
}
