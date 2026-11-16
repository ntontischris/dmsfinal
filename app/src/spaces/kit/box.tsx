"use client";

import { Accordion } from "radix-ui";
import type { ReactNode } from "react";

// Κουτιά κλειστά από προεπιλογή (Radix Accordion): κάθε κουτί δείχνει τίτλο + μία γραμμή σύνοψης και ανοίγει μόνο του.
// Το περιεχόμενο μένει στη σελίδα κρυφό (forceMount), ώστε ό,τι γράφτηκε σε ένα κουτί να μη χάνεται όταν κλείνει.
export interface BoxItem {
  id: string;
  title: string;
  summary: ReactNode;
  isAlert?: boolean;
  content: ReactNode;
}

interface BoxStackProps {
  label: string;
  items: readonly BoxItem[];
}

const numberOf = (index: number): string => String(index + 1).padStart(2, "0");

export function BoxStack({ label, items }: BoxStackProps) {
  return (
    <Accordion.Root type="multiple" className="box-stack" aria-label={label}>
      {items.map((item, index) => (
        <Accordion.Item
          key={item.id}
          value={item.id}
          className="box"
          data-alert={item.isAlert ?? false}
        >
          <Accordion.Header className="box-head">
            <Accordion.Trigger className="box-trigger">
              <span className="box-num" aria-hidden="true">
                {numberOf(index)}
              </span>
              <span className="box-text">
                <span className="box-title">{item.title}</span>
                <span className="box-summary">{item.summary}</span>
              </span>
              <span className="box-chevron" aria-hidden="true" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="box-body" forceMount>
            {item.content}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
