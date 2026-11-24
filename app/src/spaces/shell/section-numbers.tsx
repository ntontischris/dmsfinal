"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Τι δείχνει μία κάρτα θέματος: ο μεγάλος αριθμός, μία γραμμή κάτω, και αν κάτι καθυστερεί.
export interface CardNumber {
  count: string;
  hint: string;
  isUrgent?: boolean;
}

export type CardNumbers = Readonly<Record<string, CardNumber>>;

type Store = readonly [
  CardNumbers,
  (update: (now: CardNumbers) => CardNumbers) => void,
];

const NumbersContext = createContext<Store>([{}, () => undefined]);

// Ο χώρος των αριθμών: οι κάρτες είναι στο κέλυφος, οι αριθμοί έρχονται από τη σελίδα του θέματος.
export function SectionNumbersProvider({ children }: { children: ReactNode }) {
  const store = useState<CardNumbers>({});
  return <NumbersContext value={store}>{children}</NumbersContext>;
}

export const useCardNumbers = (): CardNumbers => useContext(NumbersContext)[0];

const without = (now: CardNumbers, codes: readonly string[]): CardNumbers =>
  Object.fromEntries(
    Object.entries(now).filter(([code]) => !codes.includes(code)),
  );

// Το layout ενός θέματος το βάζει (μέσα σε Suspense) με τους αριθμούς του· φεύγοντας από το θέμα, σβήνουν.
export function SectionNumbers({ numbers }: { numbers: CardNumbers }) {
  const [, setNumbers] = useContext(NumbersContext);
  useEffect(() => {
    setNumbers((now) => ({ ...now, ...numbers }));
    return () => setNumbers((now) => without(now, Object.keys(numbers)));
  }, [numbers, setNumbers]);
  return null;
}
