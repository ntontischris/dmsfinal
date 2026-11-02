import type { ReactNode } from "react";

import { ErrorNotice } from "@/spaces/screens/shared";

import type { ReadResult } from "../read";
import {
  getSalesPipeline,
  getSalesResults,
  getSalesSources,
} from "../sales-queries";
import { loadPeriods, type KnownPeriod } from "./m1-finance-parts";
import { M1Filters } from "./m1-filters";
import type { ReportBodyProps } from "./m1-model";
import { PipelineBody } from "./m1-sales-pipeline";
import { ResultsBody, SourcesBody } from "./m1-sales-results";

import "./m1-sales.css";

interface SellerHeader {
  isScoped: boolean;
  showSeller: boolean;
  sellers: readonly { id: string; name: string }[];
}

// Φίλτρα πάνω, σώμα κάτω· το φίλτρο Πωλητή και η σημείωση Εύρους έρχονται από την απάντηση της βάσης (Ρ4).
function Frame<T extends SellerHeader>(props: {
  base: ReportBodyProps;
  periods?: KnownPeriod[];
  result: ReadResult<T>;
  render: (data: T) => ReactNode;
}) {
  const { base, periods, result } = props;
  const { report, filters } = base;
  const header = result.ok ? result.data : undefined;
  return (
    <>
      <M1Filters
        query={{
          report: report.id,
          period: report.usesPeriod ? filters.period : undefined,
          seller: filters.sellerId,
        }}
        periods={periods}
        sellers={header?.showSeller ? header.sellers : undefined}
        isScoped={header?.isScoped}
      />
      {result.ok ? (
        props.render(result.data)
      ) : (
        <ErrorNotice what={`η Αναφορά «${report.title}»`} />
      )}
    </>
  );
}

// Οι Αναφορές πωλήσεων (prototype `screens/m1-sales.tsx`): κάθε μία φέρνει το δικό της RPC (και τις Περιόδους όπου ισχύουν).
export async function SalesReport(props: ReportBodyProps) {
  const { report, filters } = props;
  switch (report.id) {
    case "pipeline": {
      const result = await getSalesPipeline(filters.sellerId);
      return (
        <Frame
          base={props}
          result={result}
          render={(data) => <PipelineBody {...props} data={data} />}
        />
      );
    }
    case "results": {
      const [periods, result] = await Promise.all([
        loadPeriods(),
        getSalesResults(filters.period, filters.sellerId),
      ]);
      return (
        <Frame
          base={props}
          periods={periods}
          result={result}
          render={(data) => <ResultsBody {...props} data={data} />}
        />
      );
    }
    case "sources": {
      const [periods, result] = await Promise.all([
        loadPeriods(),
        getSalesSources(filters.period, filters.sellerId),
      ]);
      return (
        <Frame
          base={props}
          periods={periods}
          result={result}
          render={(data) => <SourcesBody {...props} data={data} />}
        />
      );
    }
    default:
      return null;
  }
}
