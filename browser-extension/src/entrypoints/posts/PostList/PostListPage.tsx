import React from "react";
import SocialNetworkSelector from "../Shared/SocialNetworkSelector";
import { Spinner } from "@/components/ui/spinner";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Funnel } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import DisplayPublicationDate from "../Developer/DisplayPublicationDate";

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
      {!isLoading && (!data || data.length === 0) && (
        <p className="text-center">Aucune publication</p>
      )}

      <div className="flex flex-col gap-4">
        {data &&
          data.length > 0 &&
          data.map((post) => (
            <Card key={post.postId}>
              <CardContent className="flex items-center gap-5">
                <Checkbox className="mr-2" />
                <div className="w-full">
                  <div className="flex">
                    {/* TODO Ajouter image pour instagram si réalisable*/}
                    {post.socialNetwork === "YOUTUBE" && (
                      <img
                        src={`https://img.youtube.com/vi/${post.postId}/0.jpg`}
                        alt=""
                        className="w-48 h-32 object-cover mr-4 rounded"
                      />
                    )}
                    <div className="text-left flex flex-col items-start">
                      <span className="font-semibold text-lg mb-1">
                        {post.title}
                      </span>
                      <span className="mt-0">URL: {post.url}</span>
                      {/* TODO à remplacer par un composant dédié conforme aux maquettes */}
                      <DisplayPublicationDate date={post.publishedAt} />
                    </div>
                  </div>
                  <Card className="bg-muted mt-2 flex flex-row px-5 py-3 items-center justify-between">
                    <div className="font-semibold">
                      Analyse du{" "}
                      {new Date(post.lastAnalysisDate).toLocaleDateString(
                        undefined,
                        {
                          day: "numeric",
                          month: "short",
                        },
                      )}
                    </div>
                    <div>
                      <Button variant="ghost" size="sm">
                        Relancer l&apos;analyse
                      </Button>
                      <Button variant="ghost" size="sm">
                        Voir le détail
                      </Button>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}

export default PostListPage;
