import { Logo } from "@/components/shared/Logo";
import React from "react";
export function SidePanelLayout({ children }: React.PropsWithChildren) {
  return (
    <div className="flex flex-col p-[33px] gap-10">
      <Logo className="mx-auto" />

      {children}
    </div>
  );
}

export function SidePanelHeader({ children }: React.PropsWithChildren) {
  return <div className="w-full flex flex-col gap-6">{children}</div>;
}

export function SidePanelTitle({ children }: React.PropsWithChildren) {
  return (
    <div className="m-auto text-2xl font-medium tracking-tight font-[Red Hat Display Variable] [&>svg]:inline [&>svg]:mr-1 [&>svg]:mb-1 [&>svg]:size-5">
      {children}
    </div>
  );
}

export function SidePanelActions({ children }: React.PropsWithChildren) {
  return <div className="flex flex-col gap-2">{children}</div>;
}
