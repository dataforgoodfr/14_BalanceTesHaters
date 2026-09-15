import { describe, expect, test } from "vitest";
import { parseIntegerSwallowingSeparators } from "../parseIntegerSwallowingSeparators";

describe("parseIntegerSwallowingSeparators", () => {
  test("parses integers with comma and whitespace separators", () => {
    expect(parseIntegerSwallowingSeparators("1,234 567")).toBe(1234567);
  });

  test("throws for invalid integers", () => {
    expect(() => parseIntegerSwallowingSeparators("not a number")).toThrow(
      "Cannot parse text: invalid integer : not a number",
    );
  });
});
