import { describe, expect, it } from "vitest";

import {
  canonicalType,
  parseCsvDate,
  parseCsvLine,
  parseMeasurementsCsv,
} from "./csv-import";

describe("parseCsvLine", () => {
  it("splits plain and quoted cells", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
    expect(parseCsvLine('"he said ""hi""",x')).toEqual(['he said "hi"', "x"]);
  });
});

describe("canonicalType", () => {
  it("maps aliases (case/space/underscore-insensitive) to canonical types", () => {
    expect(canonicalType("Resting HR")).toBe("restingHr");
    expect(canonicalType("resting_heart_rate")).toBe("restingHr");
    expect(canonicalType("Body Fat %")).toBeNull(); // '%' not stripped -> unknown
    expect(canonicalType("bodyfat")).toBe("bodyFat");
    expect(canonicalType("HRV")).toBe("hrv");
    expect(canonicalType("stepcount")).toBe("steps");
    expect(canonicalType("nonsense")).toBeNull();
  });
});

describe("parseCsvDate", () => {
  it("parses ISO date-only to local midnight", () => {
    const d = parseCsvDate("2026-07-13");
    expect(d).toEqual(new Date(2026, 6, 13));
  });
  it("accepts slash separators and datetime", () => {
    expect(parseCsvDate("2026/07/13")).toEqual(new Date(2026, 6, 13));
    expect(parseCsvDate("2026-07-13 08:30")).not.toBeNull();
    expect(parseCsvDate("2026-07-13T08:30:00")).not.toBeNull();
  });
  it("parses epoch seconds and millis", () => {
    expect(parseCsvDate("1000000000")).toEqual(new Date(1000000000 * 1000));
    expect(parseCsvDate("1000000000000")).toEqual(new Date(1000000000000));
  });
  it("rejects locale-ambiguous formats", () => {
    expect(parseCsvDate("01/02/2026")).toBeNull();
    expect(parseCsvDate("13-07-2026")).toBeNull();
    expect(parseCsvDate("July 13, 2026")).toBeNull();
  });
});

describe("parseMeasurementsCsv", () => {
  it("parses valid rows with header aliases and type aliases", () => {
    const csv = [
      "timestamp,metric,val,units",
      "2026-01-01,Resting HR,58,bpm",
      "2026-01-02,bodyweight,80.5,kg",
    ].join("\n");
    const r = parseMeasurementsCsv(csv);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({
      type: "restingHr",
      value: 58,
      unit: "bpm",
    });
    expect(r.rows[1]).toMatchObject({
      type: "weight",
      value: 80.5,
      unit: "kg",
    });
    expect(r.skipped).toEqual([]);
  });

  it("reports skip reasons instead of silently dropping rows", () => {
    const csv = [
      "date,type,value",
      "2026-01-01,weight,80",
      "2026-01-02,unknowntype,5", // unrecognized type
      "01/02/2026,weight,81", // ambiguous date
      "2026-01-03,weight,abc", // non-numeric
      ",weight,82", // missing field
    ].join("\n");
    const r = parseMeasurementsCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.totalDataRows).toBe(5);
    const reasons = Object.fromEntries(
      r.skipped.map((s) => [s.reason, s.count]),
    );
    expect(reasons["unrecognized type"]).toBe(1);
    expect(reasons["unrecognized date (use YYYY-MM-DD)"]).toBe(1);
    expect(reasons["non-numeric value"]).toBe(1);
    expect(reasons["missing a required field"]).toBe(1);
  });

  it("collapses in-file duplicates (same type + time + value)", () => {
    const csv = [
      "date,type,value",
      "2026-01-01,weight,80",
      "2026-01-01,weight,80", // exact dup
      "2026-01-01,weight,81", // different value, kept
    ].join("\n");
    const r = parseMeasurementsCsv(csv);
    expect(r.rows).toHaveLength(2);
    expect(r.duplicatesInFile).toBe(1);
  });

  it("throws on structural problems", () => {
    expect(() => parseMeasurementsCsv("date,type,value")).toThrow();
    expect(() => parseMeasurementsCsv("a,b,c\n1,2,3")).toThrow(
      /must include date/,
    );
  });
});
