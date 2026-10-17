// Όσο φορτώνει το σώμα μιας Αναφοράς: γκρίζες γραμμές στη θέση του πίνακα.
export function ReportSkeleton({ title }: { title: string }) {
  return (
    <div aria-busy="true" aria-label={`${title}: φορτώνει`} className="grid gap-2 rounded-md border bg-card p-4">
      {[0, 1, 2, 3].map((line) => (
        <span key={line} className="h-4 animate-pulse rounded-sm bg-muted" />
      ))}
    </div>
  );
}
