import { FolderCode } from "lucide-react";

function NoPost() {
  return (
    <div className="flex flex-col items-center max-w-xs mx-auto gap-1 ">
      <FolderCode className="bg-secondary p-2 w-8 h-8 rounded-md" />
      <div className="text-primary font-semibold">
        Aucune publication analysée
      </div>
      <div className="text-muted-foreground">
        Modifie la période ou lance une nouvelle analyse sur une publication
        YouTube/Instagram.
      </div>
    </div>
  );
}

export default NoPost;
