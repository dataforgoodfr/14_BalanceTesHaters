import { Separator } from "@base-ui/react";

function PageHeader({ title }: Readonly<{ title: string }>) {
  return (
    <div>
      <h4 className="text-left w-full mb-3">{title}</h4>
      <Separator className="w-screen -ms-8 border" />
    </div>
  );
}

export default PageHeader;
