/**
 * Pure CSV parsing/formatting helpers shared by the transactions export
 * (`src/app/api/transactions/export/route.ts`) and import
 * (`src/app/api/transactions/import/route.ts`,
 * `components/transactions/ImportTransactionsModal.tsx`) flows. Kept
 * dependency-free and side-effect-free so it's cheap to unit test and safe
 * to run on both the server and the client.
 */

/** A single CSV field value. `null`/`undefined` render as an empty field. */
export type CsvFieldValue = string | number | null | undefined;

/**
 * Escapes a single CSV field per RFC 4180: wraps the value in double quotes
 * whenever it contains a comma, double quote, or newline, doubling any
 * embedded double quotes. Values with no special characters are returned
 * unquoted — unquoted is valid CSV and keeps the common case readable.
 */
export function escapeCsvField(value: CsvFieldValue): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Joins already-ordered field values into one escaped CSV row (no trailing newline). */
export function buildCsvRow(fields: CsvFieldValue[]): string {
  return fields.map(escapeCsvField).join(",");
}

/**
 * Builds a full CSV document (header row + data rows) using CRLF line
 * endings per RFC 4180, ending with a trailing CRLF after the last row.
 */
export function buildCsv(headers: string[], rows: CsvFieldValue[][]): string {
  const lines = [buildCsvRow(headers), ...rows.map(buildCsvRow)];
  return lines.join("\r\n") + "\r\n";
}

/** Formats a Date (or ISO/date string) as a `YYYY-MM-DD` date-only string. Returns "" for invalid/empty input. */
export function toIsoDateString(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * Hand-rolled RFC-4180-ish CSV parser: handles quoted fields, embedded
 * commas/newlines inside quotes, escaped quotes (`""`), and both CRLF and
 * LF line endings. The first record becomes `headers`; fully blank lines
 * (no delimiters, empty content) are dropped so a trailing newline at the
 * end of the file doesn't produce a phantom empty row.
 *
 * A small hand-rolled parser is used instead of a dependency: the format
 * needed here (quoted fields with embedded commas/newlines, `""` escaping)
 * is fully specified by RFC 4180 and small enough to implement and test
 * directly, so pulling in a CSV library isn't warranted.
 */
export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const pushField = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  while (i < len) {
    const char = text[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }

    if (char === "\r") {
      // Treat CRLF and lone CR as a single record break.
      pushRecord();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }

    if (char === "\n") {
      pushRecord();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Flush a trailing field/record when the text doesn't end with a newline.
  if (field.length > 0 || record.length > 0) {
    pushRecord();
  }

  // Drop rows produced by a stray blank line (a single empty-string field) —
  // most commonly a trailing newline at end-of-file.
  const nonBlankRecords = records.filter(
    (r) => !(r.length === 1 && r[0] === ""),
  );

  const [headerRow, ...dataRows] = nonBlankRecords;
  return {
    headers: headerRow ?? [],
    rows: dataRows,
  };
}
