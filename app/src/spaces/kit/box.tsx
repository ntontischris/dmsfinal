"use client";

import { ChevronDown } from "lucide-react";
import { Accordion } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// Κουτιά κλειστά από προεπιλογή (Radix Accordion): κάθε κουτί δείχνει τίτλο + μία γραμμή σύνοψης και ανοίγει μόνο του.
// Το περιεχόμενο μένει στη σελίδα κρυφό (forceMount), ώστε ό,τι γράφτηκε σε ένα κουτί να μη χάνεται όταν κλείνει.
export interface BoxItem {
  id: string;
  title: string;
  summary: ReactNode;
  icon?: ReactNode;
  isAlert?: boolean;
  content: ReactNode;
}

interface BoxStackProps {
  label: string;
  items: readonly BoxItem[];
}

const numberOf = (index: number): string => String(index + 1).padStart(2, "0");

function BoxMark({ item, index }: { item: BoxItem; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 place-items-center rounded-2xl bg-primary/15 text-sm font-extrabold text-primary tabular-nums [&>svg]:size-5",
        item.isAlert && "bg-destructive/15 text-destructive",
      )}
    >
      {item.icon ?? numberOf(index)}
    </span>
  );
}

export function BoxStack({ label, items }: BoxStackProps) {
  return (
    <Accordion.Root
      type="multiple"
      className="mb-4 grid min-w-0 gap-3"
      aria-label={label}
    >
      {items.map((item, index) => (
        <Accordion.Item
          key={item.id}
          value={item.id}
          className="group min-w-0 rounded-3xl border bg-muted transition-colors hover:border-border-strong data-[state=open]:border-border-strong data-[state=open]:bg-card"
          data-alert={item.isAlert ?? false}
        >
          <Accordion.Header className="m-0">
            <Accordion.Trigger className="box-trigger grid min-h-11 w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl px-5 py-4 text-left">
              <BoxMark item={item} index={index} />
              <span className="grid min-w-0 gap-0.5">
                <span className="text-[0.7rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {item.title}
                </span>
                <span className="text-[1.05rem] font-semibold [overflow-wrap:anywhere]">
                  {item.summary}
                </span>
              </span>
              <span className="grid size-9 place-items-center rounded-full border border-border-strong transition group-data-[state=open]:rotate-180 group-data-[state=open]:border-transparent group-data-[state=open]:bg-primary group-data-[state=open]:text-primary-foreground">
                <ChevronDown className="size-4" aria-hidden="true" />
              </span>
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
