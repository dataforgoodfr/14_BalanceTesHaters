import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  getSettings,
  setSettings as saveSettings,
  type Settings,
} from "@/shared/storage/settings-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../Shared/PageHeader";

type SettingName = keyof Settings;
const settingsQueryKey = ["settings"];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: settingsQueryKey,
    queryFn: getSettings,
  });
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: Settings) => {
      await saveSettings(settings);
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsQueryKey, settings);
    },
  });

  const updateSetting = (name: SettingName, checked: boolean) => {
    if (!settingsQuery.data) return;

    saveSettingsMutation.mutate({
      ...settingsQuery.data,
      [name]: checked,
    });
  };

  return (
    <main className="flex flex-col gap-6 text-left">
      <PageHeader title="Paramètres développeur" />

      {settingsQuery.isLoading && <Spinner className="size-8" />}

      {settingsQuery.data && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Collecte et classification</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            <SettingRow
              id="skip-screenshoting"
              label="Désactiver les captures d'écran"
              description="Les commentaires sont collectés avec une image vide."
              checked={settingsQuery.data.skipScreenshoting}
              disabled={saveSettingsMutation.isPending}
              onCheckedChange={(checked) =>
                void updateSetting("skipScreenshoting", checked)
              }
            />
            <SettingRow
              id="skip-submit-for-classification"
              label="Désactiver l'envoi pour classification"
              description="Les collectes restent en attente et ne sont pas envoyées au serveur."
              checked={settingsQuery.data.skipSubmitForClassification}
              disabled={saveSettingsMutation.isPending}
              onCheckedChange={(checked) =>
                void updateSetting("skipSubmitForClassification", checked)
              }
            />
          </CardContent>
        </Card>
      )}

      {saveSettingsMutation.isPending && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner className="size-4" /> Enregistrement...
        </div>
      )}
      {saveSettingsMutation.isError ||
        (saveSettingsMutation.isError && (
          <div role="alert" className="text-destructive text-sm">
            Impossible de lire ou d'enregistrer les paramètres.
          </div>
        ))}
    </main>
  );
}

function SettingRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 first:pt-0 last:pb-0">
      <div className="space-y-1">
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        <div className="text-muted-foreground text-sm">{description}</div>
      </div>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
