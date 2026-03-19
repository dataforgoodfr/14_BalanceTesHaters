import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function tryOrElse<T>(tryFn: () => T, elseValue: T): T {
  try {
    return tryFn();
  } catch {
    return elseValue;
  }
}
