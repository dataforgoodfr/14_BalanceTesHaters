import React from "react";
import SocialNetworkSelector from "../Shared/SocialNetworkSelector";
import { Spinner } from "@/components/ui/spinner";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Funnel } from "lucide-react";

function PostListPage() {
  const [socialNetworkFilter, setSocialNetworkFilter] = React.useState<
    string[]
  >(["YOUTUBE"]);
  const queryKey = ["posts", socialNetworkFilter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getPostsBySocialNetworkAndPeriod(socialNetworkFilter),
  });

  return (
    <div className="p-4 flex flex-col gap-6 w-3/4">
      <h1 className="mt-2">Publications analysées</h1>
      <SocialNetworkSelector
        value={socialNetworkFilter}
        onChange={setSocialNetworkFilter}
      />

      <div className="flex gap-3">
        <Input placeholder="Rechercher" />
        <Button variant="outline">
          Filtrer <Funnel />
        </Button>
        <Button variant="outline">
          Trier <ArrowDownUp />
        </Button>
      </div>

      {isLoading && <Spinner className="size-8" />}
      {!isLoading && (!data || data.length === 0) && <p className="text-center">Aucune publication</p>}

      <div>
        {data && data.length > 0 && (
          <Card>
            <CardContent>Hello</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default PostListPage;
