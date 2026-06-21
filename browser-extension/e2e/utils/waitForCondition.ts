import { sleep } from "@/shared/utils/sleep";

export type Condition = () => Promise<boolean> | boolean;

type WaitForConditionArgs = {
  /** Condition to be met to stop waiting */
  condition: Condition;
  timeout: number;
  interval?: number;
};

export async function waitForCondition({
  condition,
  timeout,
  interval = 500,
}: WaitForConditionArgs): Promise<WaitForConditionResult> {
  const start = Date.now();
  for (;;) {
    if (await condition()) {
      return "condition-matched";
    }
    const elapsed = Date.now() - start;
    if (elapsed > timeout) {
      return "timeout-reached";
    }
    await sleep(interval);
  }
}

export type WaitForConditionResult = "timeout-reached" | "condition-matched";

export async function waitForConditionOrThrow({
  condition,
  timeout,
  interval = 500,
}: WaitForConditionArgs): Promise<void> {
  const result = await waitForCondition({ condition, timeout, interval });
  if (result === "timeout-reached") {
    throw new WaitForConditionTimeoutError(timeout, condition.toString());
  }
}

export class WaitForConditionTimeoutError extends Error {
  constructor(timeout: number, conditionDesc: string) {
    super(
      `Timeout reached while waiting for condition (timeout:${timeout}ms, condition:${conditionDesc}).`,
    );
  }
}
