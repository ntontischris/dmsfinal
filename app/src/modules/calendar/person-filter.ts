import type { CalendarData, CalendarMember } from "./types";
import { ME } from "./url-state";

// Το φίλτρο ατόμου του Ημερολογίου (blueprint «Φίλτρα για την ομάδα»): κρατά μόνο ό,τι αφορά ένα άτομο.
// Καθαρή συνάρτηση πάνω σε ό,τι έδωσε ήδη η βάση· δεν δείχνει τίποτα περισσότερο από όσα βλέπει ο Χρήστης.

// «me» → ο ίδιος ο Χρήστης· id που δεν είναι στη λίστα ατόμων → κανένα φίλτρο (φαίνονται όλα, όπως πριν).
const targetOf = (data: CalendarData, person: string | null): string | null => {
  if (person === ME) return data.me;
  return data.people.some((member) => member.userId === person) ? person : null;
};

export function forPerson(
  data: CalendarData,
  person: string | null,
): CalendarData {
  const target = targetOf(data, person);
  if (target === null) return data;
  const isMe = target === data.me;
  return {
    ...data,
    filmings: data.filmings.filter(
      (filming) => filming.crewIds.includes(target) || (isMe && filming.isMine),
    ),
    blocked: data.blocked.filter((block) => block.userId === target),
    busy: data.busy.filter((busy) => busy.userId === target),
    nextSteps: data.nextSteps.filter((step) => step.managerId === target),
    deadlines: data.deadlines.filter(
      (deadline) => deadline.assigneeId === target,
    ),
    tasks: data.tasks.filter((task) => task.assigneeId === target),
  };
}

export interface PersonOption {
  id: string | null;
  label: string;
}

// «Εγώ», «Όλοι» και τα υπόλοιπα μέλη. Χωρίς λίστα ατόμων (δεν βλέπει άλλους) το φίλτρο δεν φαίνεται.
export function personOptions(
  people: readonly CalendarMember[],
  me: string | null,
): readonly PersonOption[] {
  if (people.length === 0) return [];
  return [
    ...(me ? [{ id: ME, label: "Εγώ" }] : []),
    { id: null, label: "Όλοι" },
    ...people
      .filter((member) => member.userId !== me)
      .map((member) => ({ id: member.userId, label: member.name })),
  ];
}

// Η ετικέτα του ατόμου που διαλέχτηκε· άγνωστο id γίνεται «Όλοι».
export const personLabel = (
  options: readonly PersonOption[],
  person: string | null,
): string => options.find((option) => option.id === person)?.label ?? "Όλοι";
