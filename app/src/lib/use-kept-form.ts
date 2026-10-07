"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
} from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Υποβολή φόρμας που κρατά ό,τι έγραψε ο Χρήστης. Με <form action> η React αδειάζει τα πεδία μετά από κάθε
// υποβολή, ακόμα κι όταν γυρίσει λάθος, οπότε ο Χρήστης θα έχανε ό,τι πληκτρολόγησε. Εδώ τα πεδία αδειάζουν
// μόνο αν ζητηθεί, μετά από επιτυχία (π.χ. «Νέος λογαριασμός»).
export function useKeptForm(
  action: Action,
  options: { resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, isPending] = useActionState(
    action,
    INITIAL_FORM_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const { resetOnSuccess = false } = options;

  useEffect(() => {
    if (resetOnSuccess && state.notice) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };

  return { state, isPending, onSubmit, formRef };
}
