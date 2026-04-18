import { Button } from "@/components/ui/button";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";

type SocialNetworkSelectorProps = Readonly<{
  value: string[];
  onChange: (values: string[]) => void;
}>;

const SOCIAL_NETWORK_OPTIONS = [
  SocialNetwork.YouTube,
  SocialNetwork.Instagram,
] as const;

function SocialNetworkSelector({
  value,
  onChange,
}: SocialNetworkSelectorProps) {
  const selectedNetworks = value.filter((network) =>
    SOCIAL_NETWORK_OPTIONS.includes(
      network as (typeof SOCIAL_NETWORK_OPTIONS)[number],
    ),
  );

  const toggleNetwork = (network: string) => {
    const isSelected = selectedNetworks.includes(network);
    if (isSelected && selectedNetworks.length === 1) {
      // prevent deselecting all options, at least one should be selected
      return;
    }

    const updated = isSelected
      ? selectedNetworks.filter((item) => item !== network)
      : [...selectedNetworks, network];
    const ordered = SOCIAL_NETWORK_OPTIONS.filter((item) =>
      updated.includes(item),
    );
    onChange(ordered);
  };

  return (
    <div className="p-3">
      <div
        role="group"
        aria-label="Réseau social"
        className="inline-flex rounded-md border border-input p-1 gap-1"
      >
        <Button
          type="button"
          variant={
            selectedNetworks.includes(SocialNetwork.YouTube)
              ? "secondary"
              : "ghost"
          }
          size="sm"
          aria-pressed={selectedNetworks.includes(SocialNetwork.YouTube)}
          aria-label="Visualiser les résultats YouTube"
          onClick={() => toggleNetwork(SocialNetwork.YouTube)}
        >
          YouTube
        </Button>
        <Button
          type="button"
          variant={
            selectedNetworks.includes(SocialNetwork.Instagram)
              ? "secondary"
              : "ghost"
          }
          size="sm"
          aria-pressed={selectedNetworks.includes(SocialNetwork.Instagram)}
          aria-label="Visualiser les résultats Instagram"
          onClick={() => toggleNetwork(SocialNetwork.Instagram)}
        >
          Instagram
        </Button>
      </div>
    </div>
  );
}

export default SocialNetworkSelector;
