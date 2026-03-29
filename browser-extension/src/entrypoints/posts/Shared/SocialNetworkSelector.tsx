import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";

type SocialNetworkSelectorProps = Readonly<{
  value: string[];
  onChange: (values: string[]) => void;
}>;

function SocialNetworkSelector({
  value,
  onChange,
}: SocialNetworkSelectorProps) {
  const handleChange = (newVals: string[]) => {
    if (newVals.length === 0) {
      // prevent deselecting all options, at least one should be selected
      return;
    }
    onChange(newVals);
  };

  return (
    <div className="p-3">
      <ToggleGroup
        multiple
        variant="outline"
        value={value}
        onValueChange={handleChange}
        aria-label="Réseau social"
      >
        <ToggleGroupItem
          value={SocialNetwork.YouTube}
          aria-label="Visualiser les résultats YouTube"
        >
          YouTube
        </ToggleGroupItem>
        <ToggleGroupItem
          value={SocialNetwork.Instagram}
          aria-label="Visualiser les résultats Instagram"
        >
          Instagram
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default SocialNetworkSelector;
