import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  return (
    <div
      aria-label="Réseau social"
      className="bg-accent inline-flex rounded-md border border-input p-1 gap-1"
    >
      <SocialNetworkOption
        label="YouTube"
        socialNetwork={SocialNetwork.YouTube}
        selectedNetworks={selectedNetworks}
        onChange={onChange}
      />
      <SocialNetworkOption
        label="Instagram"
        socialNetwork={SocialNetwork.Instagram}
        selectedNetworks={selectedNetworks}
        onChange={onChange}
      />
    </div>
  );
}

function SocialNetworkOption({
  label,
  socialNetwork,
  selectedNetworks,
  onChange,
}: {
  label: string;
  socialNetwork: SocialNetwork;
  selectedNetworks: string[];
  onChange: (values: string[]) => void;
}) {
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
    <Button
      type="button"
      variant="ghost"
      className={cn(
        selectedNetworks.includes(socialNetwork) ? "bg-background" : "",
        "rounded-md",
      )}
      size="sm"
      aria-pressed={selectedNetworks.includes(socialNetwork)}
      aria-label={`Visualiser les résultats ${label}`}
      onClick={() => toggleNetwork(socialNetwork)}
    >
      {label}
    </Button>
  );
}

export default SocialNetworkSelector;
