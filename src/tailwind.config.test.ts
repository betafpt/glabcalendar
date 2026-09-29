import { describe, expect, it } from "vitest";
import tailwindConfig from "../tailwind.config";

describe("tailwind.config smoke test", () => {
  it("includes content paths for app and components", () => {
    expect(Array.isArray(tailwindConfig.content)).toBe(true);
    const content = tailwindConfig.content as string[];
    expect(content).toContain("./src/app/**/*.{js,ts,jsx,tsx,mdx}");
    expect(content).toContain("./src/components/**/*.{js,ts,jsx,tsx,mdx}");
  });
});
