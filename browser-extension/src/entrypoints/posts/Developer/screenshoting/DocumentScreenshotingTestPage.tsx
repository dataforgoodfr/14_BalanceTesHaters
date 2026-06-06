import { Button } from "@/components/ui/button";
import PageHeader from "../../Shared/PageHeader";
import { LongComponent } from "./LongComponent";
import {
  configsUnderTest,
  performScreenshotTests,
} from "./performScreenshotTests";
import { defaultWaitOptions, DocumentScrollable } from "@/shared/screenshoting";
import { sleep } from "@/shared/utils/sleep";

const itemCount = 5000;

async function handleScreenshotTests(
  itemCount: number,
  setTestRunning: (running: boolean) => void,
) {
  setTestRunning(true);
  try {
    await sleep(1);

    await performScreenshotTests(new DocumentScrollable(), {
      runIdPrefix: `document-${itemCount}`,
      referenceScreenshotWaitOptions: defaultWaitOptions,
      tests: configsUnderTest,
      iterationsPerConfig: 20,
    });
  } finally {
    setTestRunning(false);
  }
}
export function DocumentScreenshotingTestPage() {
  const [testRunning, setTestRunning] = useState(false);
  return (
    <main className="flex flex-col gap-6 items-start w-auto!">
      <PageHeader title="Document Screenshoting test page" />

      {testRunning ? (
        // Hide button during test to avoid button hover & focus state to create visuel diffs
        <div>Test en cours...</div>
      ) : (
        <Button
          onClick={() => void handleScreenshotTests(itemCount, setTestRunning)}
          id="test-button"
        >
          Capture page screenshot
        </Button>
      )}

      <div>
        <LongComponent nbItems={itemCount} />
      </div>
    </main>
  );
}
