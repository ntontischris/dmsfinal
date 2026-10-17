"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
} from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

type Action<D> = (state: FormState<D>, form: FormData) => Promise<FormState<D>>;

// Υποβολή φόρμας που κρατά ό,τι έγραψε ο Χρήστης. Με <form action> η React αδειάζει τα πεδία μετά από κάθε
// υποβολή, ακόμα κι όταν γυρίσει λάθος, οπότε ο Χρήστης θα έχανε ό,τι πληκτρολόγησε. Εδώ τα πεδία αδειάζουν
// μόνο αν ζητηθεί, μετά από επιτυχία (π.χ. «Νέος λογαριασμός»).
export function useKeptForm<D = never>(
  action: Action<D>,
  options: { resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, isPending] = useActionState<FormState<D>, FormData>(
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
    // Το κουμπί που πατήθηκε στέλνει και το δικό του name/value (π.χ. «Επιβεβαίωση»).
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };

  return { state, isPending, onSubmit, formRef };
}
