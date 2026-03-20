import { describe, it, expect } from "vitest";
import { ProgressManager } from "../ProgressManager";

describe("ProgressManager", () => {
  describe("setProgress", () => {
    it("should constrain progress to 0-100 range", () => {
      const progressValues: number[] = [];
      const manager = new ProgressManager((progress) => {
        progressValues.push(progress);
      });

      manager.setProgress(50);
      expect(progressValues[0]).toBe(50);

      manager.setProgress(-10);
      expect(progressValues[1]).toBe(0);

      manager.setProgress(150);
      expect(progressValues[2]).toBe(100);
    });
  });

  describe("subTaskProgressManager", () => {
    it("should map sub-task progress to parent progress range", () => {
      const progressValues: number[] = [];
      const parentManager = new ProgressManager((progress) => {
        progressValues.push(progress);
      });

      const subManager = parentManager.subTaskProgressManager({
        from: 20,
        to: 60,
      });

      // Sub-task at 0% should set parent to 20%
      subManager.setProgress(0);
      expect(progressValues[0]).toBe(20);

      // Sub-task at 100% should set parent to 60%
      subManager.setProgress(100);
      expect(progressValues[1]).toBe(60);

      // Sub-task at 50% should set parent to 40% (midpoint)
      subManager.setProgress(50);
      expect(progressValues[2]).toBe(40);
    });
  });
});
