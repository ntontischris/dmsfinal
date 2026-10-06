import type { ReportBodyProps } from "@/screens/m1-model";
import { PipelineBody } from "@/screens/m1-sales-pipeline";
import { ResultsBody, SourcesBody } from "@/screens/m1-sales-results";

import "./m1-sales.css";

export function SalesReport(props: ReportBodyProps) {
  switch (props.report.id) {
    case "pipeline":
      return <PipelineBody {...props} />;
    case "results":
      return <ResultsBody {...props} />;
    case "sources":
      return <SourcesBody {...props} />;
    default:
      return null;
  }
}
