import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorMessage } from "./error-message";

describe("errorMessage", () => {
  it("returns the first validation issue instead of the serialized Zod issue list", () => {
    const result = z.object({ DATABASE_URL: z.string({ required_error: "DATABASE_URL is required" }) }).safeParse({});
    if (result.success) throw new Error("Expected validation failure");
    expect(errorMessage(result.error, "fallback")).toBe("DATABASE_URL is required");
  });

  it("falls back for non-errors", () => {
    expect(errorMessage(null, "Unable to load data.")).toBe("Unable to load data.");
  });
});
