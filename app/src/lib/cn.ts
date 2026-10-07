import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Ενώνει κλάσεις Tailwind· η τελευταία κερδίζει όταν συγκρούονται.
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
