import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { JOBS, formatAt, redNote } from "../labels";
import type { HealthJob } from "../schemas";
import { jobVerdict, sectionVerdict } from "../status";
import { HealthCard } from "./health-card";

// Κάθε cron και κάθε βήμα του cron της ουράς: πότε τρέχει, πότε πέτυχε τελευταία, αν άργησε (Γεγονός 50).
export function JobsCard({ jobs }: { jobs: readonly HealthJob[] }) {
  const isRed = jobs.some((job) => job.state === "late");
  return (
    <HealthCard title={JOBS.title} verdict={sectionVerdict(isRed)}>
      <Table>
        <thead>
          <tr>
            <Th>{JOBS.name}</Th>
            <Th>{JOBS.schedule}</Th>
            <Th>{JOBS.lastRun}</Th>
            <Th>{JOBS.state}</Th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const verdict = jobVerdict(job);
            return (
              <Tr key={job.job}>
                <Td data-label={JOBS.name}>
                  <span className="grid">
                    <span>{job.label}</span>
                    {job.lastError && (
                      <span className="text-xs text-destructive">
                        {JOBS.error}: {job.lastError}
                      </span>
                    )}
                  </span>
                </Td>
                <Td data-label={JOBS.schedule}>{job.schedule}</Td>
                <Td data-label={JOBS.lastRun} className="whitespace-nowrap">
                  {formatAt(job.lastOkAt)}
                </Td>
                <Td data-label={JOBS.state}>
                  <Badge tone={verdict.tone}>{verdict.label}</Badge>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {isRed && (
        <p className="m-0 text-sm text-muted-foreground">{redNote(50)}</p>
      )}
    </HealthCard>
  );
}
