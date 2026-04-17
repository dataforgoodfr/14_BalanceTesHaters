import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Funnel } from "lucide-react";

function SearchSortFiltersPostList({
  searchTerm,
  setSearchTerm,
}: Readonly<{
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}>) {
  return (
    <div className="flex gap-3 w-full">
      <Input
      className="w-1/3"
        placeholder="Rechercher"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      <Button variant="outline" disabled>
        Filtrer <Funnel />
      </Button>
      <Button variant="outline" disabled>
        Trier <ArrowDownUp />
      </Button>
    </div>
  );
}

export default SearchSortFiltersPostList;
