import { Button } from "@/components/ui/button";

import { signInAsDemo } from "../actions";

// Τα κουμπιά «Δες ως…» της Εισόδου (demo.ts). Στέλνουν μόνο τη θέση στη λίστα· το email το βρίσκει ο server.
export function DemoLogins({ labels }: { labels: readonly string[] }) {
  return (
    <div className="grid gap-3 border-b pb-6">
      <p className="kit-label m-0">Επίδειξη: δες τις οθόνες χωρίς κωδικό</p>
      <div className="grid grid-cols-2 gap-2">
        {labels.map((label, index) => (
          <form key={label} action={signInAsDemo}>
            <input type="hidden" name="demo" value={index} />
            <Button type="submit" className="w-full">
              {label}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
