import { clsx, type ClassValue } from "clsx";
import { MutableRefObject } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scrollToBottom(element: MutableRefObject<HTMLElement | null>) {
  if (typeof window !== undefined) {
    window?.scrollTo({
      top: element.current?.scrollHeight!,
      behavior: "smooth",
    });
  }
}
