import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SocialNetworkSelectorProps = Readonly<{
  value: string[];
  onChange: (values: string[]) => void;
}>;

function SocialNetworkSelector({ value, onChange }: SocialNetworkSelectorProps) {
  return (
    <div className="p-3">
      <ToggleGroup
        variant="outline"
        value={value}
        onValueChange={onChange}
        aria-label="Réseau social"
      >
        <ToggleGroupItem
          value="YOUTUBE"
          aria-label="Visualiser les résultats YouTube"
        >
          YouTube
        </ToggleGroupItem>
        <ToggleGroupItem
          value="INSTAGRAM"
          aria-label="Visualiser les résultats Instagram"
        >
          Instagram
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default SocialNetworkSelector;
