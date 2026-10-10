import { describe, expect, it } from "vitest";
import { parseEarlyAccessBody } from "@/server/early-access/service";

const valid = {
  name: "  Maria   Santos ",
  email: "maria@example.com",
  social: "facebook.com/maria",
  units: "2-5",
  source: "both",
};

describe("parseEarlyAccessBody", () => {
  it("accepts a complete request and tidies whitespace", () => {
    expect(parseEarlyAccessBody(valid)).toEqual({
      ...valid,
      name: "Maria Santos",
    });
  });

  it.each([
    ["no body", null],
    ["a short name", { ...valid, name: "M" }],
    ["a bad email", { ...valid, email: "maria" }],
    ["no Facebook or Instagram", { ...valid, social: "  " }],
    ["no unit count", { ...valid, units: "" }],
    ["a very long source", { ...valid, source: "x".repeat(50) }],
  ])("rejects %s", (_label, body) => {
    expect(parseEarlyAccessBody(body)).toBeNull();
  });
});
