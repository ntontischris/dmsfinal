"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

const DELAY_MS = 300;

// Η φόρμα αναζήτησης γράφει το ?q= στη διεύθυνση όσο πληκτρολογείς (με μικρή αναμονή), κρατώντας τα κρυφά φίλτρα.
// Το Enter δουλεύει όπως πριν. Κενό πεδίο = χωρίς ?q=.
export function LiveSearchForm(props: {
  action: string;
  className: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const hrefOfForm = (form: HTMLFormElement): string => {
    const entries = [...new FormData(form).entries()]
      .map(([key, value]): [string, string] => [key, String(value).trim()])
      .filter(([, value]) => value !== "");
    const search = new URLSearchParams(entries).toString();
    return search ? `${props.action}?${search}` : props.action;
  };
  const handleInput = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (formRef.current)
        router.replace(hrefOfForm(formRef.current), { scroll: false });
    }, DELAY_MS);
  };
  return (
    <form
      ref={formRef}
      className={props.className}
      method="get"
      action={props.action}
      role="search"
      onInput={handleInput}
    >
      {props.children}
    </form>
  );
}
