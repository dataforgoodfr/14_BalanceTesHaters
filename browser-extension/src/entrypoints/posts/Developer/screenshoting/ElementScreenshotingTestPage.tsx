import { Button } from "@/components/ui/button";
import PageHeader from "../../Shared/PageHeader";
import {
  defaultWaitOptions,
  HTMLElementScrollable,
} from "@/shared/screenshoting";
import { LongComponent } from "./LongComponent";
import {
  configsUnderTest,
  performScreenshotTests,
} from "./performScreenshotTests";

const itemCount = 5000;

async function handleScreenshotTests(
  itemCount: number,
  scrollableElement: HTMLElement,
) {
  await performScreenshotTests(new HTMLElementScrollable(scrollableElement), {
    runIdPrefix: `element-${itemCount}`,
    referenceScreenshotWaitOptions: defaultWaitOptions,
    tests: configsUnderTest,
    iterationsPerConfig: 20,
  });
}
export function ElementScreenshotingTestPage() {
  const scrollableRef = useRef<HTMLDivElement>(null);
  return (
    <main className="flex flex-col gap-6 items-start w-auto!">
      <PageHeader title="Element Screenshoting test page" />

      <Button
        onClick={() =>
          void handleScreenshotTests(itemCount, scrollableRef.current!)
        }
      >
        Capture element screenshot
      </Button>
      <div ref={scrollableRef} className="overflow-auto max-h-100 border">
        <LongComponent nbItems={itemCount} />
      </div>
    </main>
  );
}
