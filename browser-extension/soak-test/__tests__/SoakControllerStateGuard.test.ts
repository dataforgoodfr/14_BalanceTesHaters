import { describe, expect, it } from "vitest";
import { SoakControllerStateGuard } from "../SoakControllerStateGuard";

describe("SoakControllerStateGuard", () => {
  it("rejects a second controller", () => {
    const guard = new SoakControllerStateGuard(["youtube-001"]);

    guard.claimController();

    expect(() => guard.claimController()).toThrow(
      "A soak controller is already connected",
    );
  });

  it("rejects restarted and duplicate attempts", () => {
    const guard = new SoakControllerStateGuard(["youtube-001"]);

    guard.startAttempt("youtube-001");
    expect(() => guard.startAttempt("youtube-001")).toThrow(
      "Cannot move soak-test attempt youtube-001 from running to running.",
    );

    guard.completeAttempt("youtube-001");
    expect(() => guard.completeAttempt("youtube-001")).toThrow(
      "Cannot move soak-test attempt youtube-001 from completed to completed.",
    );
  });
});
