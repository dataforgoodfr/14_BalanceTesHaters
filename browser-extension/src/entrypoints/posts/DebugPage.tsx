import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import {
  clearDebugScreenshots,
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
import PageHeader from "./Shared/PageHeader";

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
export function DebugPage() {
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
  return (
    <main className="flex flex-col gap-6 items-start">
      <PageHeader title="Debug" />
      <h4>
        Debug screenshot {storeScreenshotForDebug ? "(Activé)" : "(Désactivé)"}
      </h4>
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
      {screenshotsLoading ? (
        <Spinner />
      ) : !screenshots || screenshots.length == 0 ? (
        <div>
          Pas encore de screenshot stocker. Activé le debug de screenshot et
          lance une analyse pour stocker un screenshot.
        </div>
      ) : (
        screenshots.map((s, index) => (
          <div key={index} className="flex flex-row gap-2 max-h-100">
            <div className="flex-col">
              <div>
                {s.type} - {s.screenshotDate} -{" "}
                {Math.round(s.screenshotDataUrl.length / 1024)} kB
              </div>
              <Button
                onClick={() => {
                  downloadScreenshot(s.screenshotDataUrl);
                }}
              >
                <DownloadIcon />
              </Button>
            </div>

            <div className="max-h-100">
              <img src={s.screenshotDataUrl} className="max-h-100 max-w-100" />
            </div>
          </div>
        ))
      )}
    </main>
  );
}
