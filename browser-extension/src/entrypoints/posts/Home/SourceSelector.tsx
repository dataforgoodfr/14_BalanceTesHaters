import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function SourceSelector() {
  return (
    <div className="p-3">
      <ToggleGroup
        variant="outline"
        defaultValue={["youtube"]}
        aria-label="Platform"
      >
        <ToggleGroupItem
          value="youtube"
          aria-label="Visualiser les résultats YouTube"
        >
          YouTube
        </ToggleGroupItem>
        <ToggleGroupItem
          value="instagram"
          aria-label="Visualiser les résultats Instagram"
        >
          Instagram
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default SourceSelector;
