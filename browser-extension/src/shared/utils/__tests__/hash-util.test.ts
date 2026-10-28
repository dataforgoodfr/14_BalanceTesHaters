import { describe, it, expect } from "vitest";
import { hashString } from "../hash-util";

describe("hash utilities", () => {
  it("should get always the right size", async () => {
    expect(await hashString("")).toHaveLength(64);
    expect(await hashString("test")).toHaveLength(64);
    expect(
      await hashString(
        "longstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstringlongstring",
      ),
    ).toHaveLength(64);
  });

  it("should be different for different inputs", async () => {
    expect(await hashString("")).not.toBe(await hashString("test"));
  });
});
