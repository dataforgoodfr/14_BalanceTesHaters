import { cn } from "@/lib/utils";
import React from "react";

export function BthCustomSpinner({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    >
      <rect x="11" y="2" width="2" height="6" rx="1" fill="#655EDE" />
      <rect x="11" y="16" width="2" height="6" rx="1" fill="#EEEDFF" />
      <rect
        x="18.364"
        y="4.22186"
        width="2"
        height="6"
        rx="1"
        transform="rotate(45 18.364 4.22186)"
        fill="#B5B7F2"
      />
      <rect
        x="8.46448"
        y="14.1213"
        width="2"
        height="6"
        rx="1"
        transform="rotate(45 8.46448 14.1213)"
        fill="#EEEDFF"
      />
      <rect
        x="2"
        y="13"
        width="2"
        height="6"
        rx="1"
        transform="rotate(-90 2 13)"
        fill="#DDDEF9"
      />
      <rect
        x="16"
        y="13"
        width="2"
        height="6"
        rx="1"
        transform="rotate(-90 16 13)"
        fill="#DDDEF9"
      />
      <rect
        x="4.2218"
        y="5.63605"
        width="2"
        height="6"
        rx="1"
        transform="rotate(-45 4.2218 5.63605)"
        fill="#B5B7F2"
      />
      <rect
        x="14.1213"
        y="15.5355"
        width="2"
        height="6"
        rx="1"
        transform="rotate(-45 14.1213 15.5355)"
        fill="#EEEDFF"
      />
    </svg>
  );
}
