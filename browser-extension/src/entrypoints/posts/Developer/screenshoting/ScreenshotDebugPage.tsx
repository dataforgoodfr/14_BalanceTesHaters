import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import {
  clearDebugScreenshots,
  DebugScreenshot,
  getDebugScreenshots,
  isStoreDebugScreenshots,
  setStoreDebugScreenshots,
} from "@/shared/screenshoting";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CameraIcon,
  CameraOffIcon,
  DownloadIcon,
  TrashIcon,
} from "lucide-react";
import PageHeader from "../../Shared/PageHeader";
import { useState } from "react";

function downloadScreenshot(screenshotDataUrl: string) {
  console.log(
    "Downloading screenshotDataUrl (" +
      screenshotDataUrl.length / 1024 +
      " kB)",
  );

  void browser.downloads.download({
    url: screenshotDataUrl,
    filename: "screenshot.png",
  });
}
const enableScreenshotQueryKey = ["debug", "enable-screenshot"];
const getScreenshotsQueyrKey = ["debug", "screenshots"];
const screenshotTypes: Array<DebugScreenshot["type"]> = [
  "tab-image",
  "scrollable-fragment",
  "scrollable-full",
  "scrollable-cropped",
];

export function ScreenshotDebugPage() {
  const {
    data: storeScreenshotForDebug,
    isLoading: screenshotForDebugLoading,
  } = useQuery({
    queryKey: enableScreenshotQueryKey,
    queryFn: isStoreDebugScreenshots,
  });

  const storeScreenshotForDebugMutation = useMutation({
    mutationFn: setStoreDebugScreenshots,
    onSuccess: (_data, _variables, _onMutateResult, context) => {
      void context.client.invalidateQueries({
        queryKey: enableScreenshotQueryKey,
      });
    },
  });

  const clearScreenshotsMutation = useMutation({
    mutationFn: clearDebugScreenshots,
    onSuccess: (_data, _variables, _onMutateResult, context) => {
      void context.client.invalidateQueries({
        queryKey: getScreenshotsQueyrKey,
      });
    },
  });

  const { data: screenshots, isLoading: screenshotsLoading } = useQuery({
    queryKey: getScreenshotsQueyrKey,
    queryFn: getDebugScreenshots,
    refetchInterval: 1000,
  });

  const [displayedTypes, setDisplayedTypes] =
    useState<Array<DebugScreenshot["type"]>>(screenshotTypes);

  const filtered = useMemo(() => {
    return (screenshots || []).filter((s) => displayedTypes.includes(s.type));
  }, [screenshots, displayedTypes]);
  return (
    <main className="flex flex-col gap-6 items-start">
      <PageHeader
        title={`Screenshoting debug ${storeScreenshotForDebug ? "(Activé)" : "(Désactivé)"}`}
      />
      <h4>Config</h4>
      <div className="flex-row gap-2">
        <Toggle
          aria-label="Toggle screenshot"
          size="sm"
          variant="outline"
          pressed={storeScreenshotForDebug || false}
          disabled={screenshotForDebugLoading}
          onPressedChange={(v) =>
            void storeScreenshotForDebugMutation.mutate(v)
          }
        >
          {screenshotForDebugLoading ||
          storeScreenshotForDebugMutation.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : storeScreenshotForDebug ? (
            <>
              <CameraOffIcon />
              Désactiver
            </>
          ) : (
            <>
              <CameraIcon />
              Activer
            </>
          )}
        </Toggle>
        <Button
          onClick={() => {
            clearScreenshotsMutation.mutate();
          }}
        >
          {clearScreenshotsMutation.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <TrashIcon />
          )}
          Clear
        </Button>
      </div>
      <h4>Screenshots</h4>
      {screenshotsLoading ? (
        <Spinner />
      ) : !screenshots || screenshots.length == 0 ? (
        <div>
          Pas encore de screenshot stockés. Activé le debug de screenshot et
          lance une analyse pour stocker un screenshot.
        </div>
      ) : (
        <>
          <div>
            {screenshotTypes.map((toggleSt) => (
              <Toggle
                key={toggleSt}
                size="sm"
                variant="outline"
                pressed={displayedTypes.includes(toggleSt)}
                onPressedChange={(enabled) => {
                  if (enabled) {
                    void setDisplayedTypes([...displayedTypes, toggleSt]);
                  } else {
                    void setDisplayedTypes(
                      displayedTypes.filter((st) => st !== toggleSt),
                    );
                  }
                }}
              >
                {toggleSt}
              </Toggle>
            ))}
          </div>
          <table className="text-left">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Desc</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, index) => (
                <tr key={index} className="max-h-100 ">
                  <td className="align-top p-1 min-w-10">{s.type}</td>
                  <td className="align-top p-1">{s.screenshotDate}</td>
                  <td className="align-top p-1 min-w-10">{s.desc}</td>

                  <td className="align-top p-1">
                    <img
                      src={s.screenshotDataUrl}
                      className="max-h-100 max-w-100"
                    />
                  </td>
                  <td className="align-top p-1">
                    <Button
                      onClick={() => {
                        downloadScreenshot(s.screenshotDataUrl);
                      }}
                    >
                      <DownloadIcon />{" "}
                      {Math.round(s.screenshotDataUrl.length / 1024)} kB
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
