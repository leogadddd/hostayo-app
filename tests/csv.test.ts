import { describe, expect, it } from "vitest";
import { centavosToDecimal, toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines", () => {
    const csv = toCsv(["a", "b"], [['x,"y"', "line1\nline2"]]);
    expect(csv).toBe('﻿a,b\r\n"x,""y""","line1\nline2"\r\n');
  });

  it("neutralises spreadsheet formulas in text but not numbers", () => {
    const csv = toCsv(["a"], [["=SUM(A1)"], ["-5 pax"], [-12.5]]);
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain("'-5 pax");
    expect(csv).toContain("\r\n-12.5\r\n");
  });
});

describe("centavosToDecimal", () => {
  it("formats signed centavos", () => {
    expect(centavosToDecimal(123450)).toBe("1234.50");
    expect(centavosToDecimal(5)).toBe("0.05");
    expect(centavosToDecimal(-250)).toBe("-2.50");
  });
});
