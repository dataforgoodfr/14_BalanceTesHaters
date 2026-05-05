import { Separator } from "@base-ui/react";

function PageHeader({ title }: Readonly<{ title: string }>) {
  return (
    <div className="w-full relative">
      <h4 className="text-left w-full mb-3">{title}</h4>

      {/* 
      PageHeader is meant to be used only inside a <main> tag
      The separator is configured to overflow on <main> padding
      */}
      <Separator className="absolute w-[calc(100%+var(--spacing)*8)] -mx-4 border" />
    </div>
  );
}

export default PageHeader;
