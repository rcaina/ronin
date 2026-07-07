import { describe, expect, it } from "vitest";
import {
  buildCsv,
  buildCsvRow,
  escapeCsvField,
  parseCsv,
  toIsoDateString,
} from "@/lib/utils/csv";

describe("escapeCsvField", () => {
  it("returns simple values unquoted", () => {
    expect(escapeCsvField("Groceries")).toBe("Groceries");
    expect(escapeCsvField(42)).toBe("42");
  });

  it("renders null/undefined as an empty field", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });

  it("quotes fields containing a comma", () => {
    expect(escapeCsvField("Rent, utilities")).toBe('"Rent, utilities"');
  });

  it("quotes fields containing a double quote and doubles it", () => {
    expect(escapeCsvField('The "big" sale')).toBe('"The ""big"" sale"');
  });

  it("quotes fields containing a newline", () => {
    expect(escapeCsvField("line one\nline two")).toBe('"line one\nline two"');
  });

  it("quotes fields containing a carriage return", () => {
    expect(escapeCsvField("line one\r\nline two")).toBe(
      '"line one\r\nline two"',
    );
  });
});

describe("buildCsvRow", () => {
  it("joins escaped fields with commas", () => {
    expect(buildCsvRow(["2024-01-15", "Rent, base", 1200, null])).toBe(
      '2024-01-15,"Rent, base",1200,',
    );
  });
});

describe("buildCsv", () => {
  it("builds a header row plus data rows with CRLF endings", () => {
    const csv = buildCsv(
      ["Date", "Name", "Amount"],
      [
        ["2024-01-01", "Coffee", 4.5],
        ["2024-01-02", "Rent, deposit", 1000],
      ],
    );

    expect(csv).toBe(
      'Date,Name,Amount\r\n2024-01-01,Coffee,4.5\r\n2024-01-02,"Rent, deposit",1000\r\n',
    );
  });

  it("produces an empty CSV (just the header) for zero rows", () => {
    expect(buildCsv(["Date", "Name"], [])).toBe("Date,Name\r\n");
  });
});

describe("toIsoDateString", () => {
  it("formats a Date object as YYYY-MM-DD", () => {
    expect(toIsoDateString(new Date(Date.UTC(2024, 2, 5)))).toBe("2024-03-05");
  });

  it("formats an ISO datetime string as its date portion", () => {
    expect(toIsoDateString("2024-03-05T18:30:00.000Z")).toBe("2024-03-05");
  });

  it("returns an empty string for null/undefined/invalid input", () => {
    expect(toIsoDateString(null)).toBe("");
    expect(toIsoDateString(undefined)).toBe("");
    expect(toIsoDateString("not a date")).toBe("");
  });
});

describe("parseCsv", () => {
  it("parses a simple CSV with a header and data rows", () => {
    const { headers, rows } = parseCsv(
      "Date,Name,Amount\n2024-01-01,Coffee,4.50\n2024-01-02,Lunch,12.00\n",
    );
    expect(headers).toEqual(["Date", "Name", "Amount"]);
    expect(rows).toEqual([
      ["2024-01-01", "Coffee", "4.50"],
      ["2024-01-02", "Lunch", "12.00"],
    ]);
  });

  it("handles CRLF line endings", () => {
    const { headers, rows } = parseCsv(
      "Date,Name\r\n2024-01-01,Coffee\r\n2024-01-02,Lunch\r\n",
    );
    expect(headers).toEqual(["Date", "Name"]);
    expect(rows).toEqual([
      ["2024-01-01", "Coffee"],
      ["2024-01-02", "Lunch"],
    ]);
  });

  it("parses quoted fields containing embedded commas", () => {
    const { rows } = parseCsv(
      'Date,Name,Amount\n2024-01-01,"Rent, base",1200\n',
    );
    expect(rows).toEqual([["2024-01-01", "Rent, base", "1200"]]);
  });

  it("parses quoted fields containing embedded newlines", () => {
    const { rows } = parseCsv('Date,Notes\n2024-01-01,"line one\nline two"\n');
    expect(rows).toEqual([["2024-01-01", "line one\nline two"]]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    const { rows } = parseCsv('Date,Name\n2024-01-01,"The ""big"" sale"\n');
    expect(rows).toEqual([["2024-01-01", 'The "big" sale']]);
  });

  it("ignores a trailing blank line", () => {
    const { headers, rows } = parseCsv("Date,Name\n2024-01-01,Coffee\n\n");
    expect(headers).toEqual(["Date", "Name"]);
    expect(rows).toEqual([["2024-01-01", "Coffee"]]);
  });

  it("handles a file with no trailing newline", () => {
    const { headers, rows } = parseCsv("Date,Name\n2024-01-01,Coffee");
    expect(headers).toEqual(["Date", "Name"]);
    expect(rows).toEqual([["2024-01-01", "Coffee"]]);
  });

  it("returns empty headers/rows for an empty string", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });

  it("handles a header-only CSV (no data rows)", () => {
    expect(parseCsv("Date,Name,Amount\n")).toEqual({
      headers: ["Date", "Name", "Amount"],
      rows: [],
    });
  });

  it("preserves empty fields within a row", () => {
    const { rows } = parseCsv("Date,Name,Amount\n2024-01-01,,4.50\n");
    expect(rows).toEqual([["2024-01-01", "", "4.50"]]);
  });
});
