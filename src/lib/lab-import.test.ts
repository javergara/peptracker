import { describe, expect, it } from "vitest";

import {
  parseLabLine,
  parseReportDate,
  parseLabReport,
} from "@/lib/lab-import";

describe("parseLabLine", () => {
  it("parses name / value / unit / range with a hyphen range", () => {
    const row = parseLabLine("CREATININA   1.15   mg/dL   0.70 - 1.30");
    expect(row).not.toBeNull();
    expect(row!.marker).toBe("CREATININA");
    expect(row!.value).toBe(1.15);
    expect(row!.unit).toBe("mg/dL");
    expect(row!.refLow).toBe(0.7);
    expect(row!.refHigh).toBe(1.3);
  });

  it("handles a decimal comma value", () => {
    const row = parseLabLine("HEMOGLOBINA 15,2 g/dL 13 - 17");
    expect(row!.value).toBe(15.2);
    expect(row!.unit).toBe("g/dL");
    expect(row!.refLow).toBe(13);
    expect(row!.refHigh).toBe(17);
  });

  it("parses a '< high' upper-bound-only range", () => {
    const row = parseLabLine("COLESTEROL TOTAL 195 mg/dL < 200");
    expect(row!.marker).toBe("COLESTEROL TOTAL");
    expect(row!.value).toBe(195);
    expect(row!.refHigh).toBe(200);
    expect(row!.refLow).toBeNull();
  });

  it("parses a '> low' lower-bound-only range", () => {
    const row = parseLabLine("HDL 42 mg/dL > 40");
    expect(row!.value).toBe(42);
    expect(row!.refLow).toBe(40);
    expect(row!.refHigh).toBeNull();
  });

  it("leaves unit null when the token isn't a recognized unit", () => {
    const row = parseLabLine("GLICEMIA 90 basal 70 - 100");
    expect(row!.value).toBe(90);
    expect(row!.unit).toBeNull();
    expect(row!.refLow).toBe(70);
    expect(row!.refHigh).toBe(100);
  });

  it("skips header/metadata lines", () => {
    expect(parseLabLine("Paciente: Juan Perez")).toBeNull();
    expect(parseLabLine("Fecha: 06/06/2026")).toBeNull();
    expect(parseLabLine("Valores de referencia")).toBeNull();
    expect(parseLabLine("Pagina 1 de 3")).toBeNull();
  });

  it("skips lines with no number or no name", () => {
    expect(parseLabLine("RESULTADOS DE LABORATORIO")).toBeNull();
    expect(parseLabLine("123 456")).toBeNull();
    expect(parseLabLine("")).toBeNull();
  });
});

describe("parseReportDate", () => {
  it("prefers a labeled Fecha date (dd/mm/yyyy → ISO)", () => {
    expect(parseReportDate("Fecha de toma: 06/06/2026\nmore")).toBe(
      "2026-06-06",
    );
  });

  it("parses an ISO date", () => {
    expect(parseReportDate("Collected 2026-01-14 by lab")).toBe("2026-01-14");
  });

  it("expands a 2-digit year", () => {
    expect(parseReportDate("Fecha 07/09/26")).toBe("2026-09-07");
  });

  it("returns null when no date is present", () => {
    expect(parseReportDate("no dates here")).toBeNull();
  });

  it("rejects an impossible date", () => {
    expect(parseReportDate("45/45/2026")).toBeNull();
  });
});

describe("parseLabReport", () => {
  it("extracts multiple rows and the date from a small report", () => {
    const text = [
      "LABORATORIO CLINICO SURA",
      "Paciente: Alejandro",
      "Fecha: 06/06/2026",
      "COLESTEROL TOTAL 195 mg/dL < 200",
      "HDL 42 mg/dL > 40",
      "CREATININA 1,15 mg/dL 0.70 - 1.30",
      "Pagina 1 de 2",
    ].join("\n");
    const report = parseLabReport(text);
    expect(report.date).toBe("2026-06-06");
    expect(report.rows.map((r) => r.marker)).toEqual([
      "COLESTEROL TOTAL",
      "HDL",
      "CREATININA",
    ]);
    expect(report.rows[2].value).toBe(1.15);
  });
});
