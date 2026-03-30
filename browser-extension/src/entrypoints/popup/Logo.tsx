import logoUrl from "~/assets/bth-logo.svg";

export function Logo({ className = "" }: { className: string }) {
  return <img src={logoUrl} className={"w-[94px] h-[42px] " + className}></img>;
}
