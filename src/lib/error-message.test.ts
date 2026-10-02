import { describe, expect, it } from "vitest";
import { errorMessage } from "./error-message";

describe("errorMessage utility", () => {
  it("extracts message from standard Error instances", () => {
    const error = new Error("Database connection timed out");
    expect(errorMessage(error, "Fallback")).toBe("Database connection timed out");
  });

  it("extracts message from Zod-like validation issues", () => {
    const zodError = {
      issues: [{ message: "Start time must be before end time" }],
    };
    expect(errorMessage(zodError, "Fallback")).toBe("Start time must be before end time");
  });

  it("returns fallback when error is unknown or empty", () => {
    expect(errorMessage(null, "Fallback message")).toBe("Fallback message");
    expect(errorMessage(undefined, "Fallback message")).toBe("Fallback message");
    expect(errorMessage({}, "Fallback message")).toBe("Fallback message");
    expect(errorMessage(new Error("   "), "Fallback message")).toBe("Fallback message");
  });
});
