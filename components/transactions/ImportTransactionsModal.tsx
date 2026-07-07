"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, FileUp, Upload } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../Modal";
import Button from "../Button";
import UpgradeModal from "../UpgradeModal";
import { useActiveBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import {
  useImportTransactions,
  useImportTransactionsPreview,
} from "@/lib/data-hooks/transactions/useTransactions";
import { UpgradeRequiredError } from "@/lib/data-hooks/services/http";
import { parseCsv } from "@/lib/utils/csv";
import {
  REQUIRED_IMPORT_COLUMNS,
  type ImportColumnKey,
  type ImportPreviewRow,
  type RawImportRow,
} from "@/lib/utils/transaction-import";
import { formatCurrency } from "@/lib/utils";

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** True when the account may import (premium). Free users see a paywall. */
  canImport: boolean;
}

type Step = "upload" | "map" | "preview";

// Human labels for each mappable column and whether it's required.
const COLUMN_META: {
  key: ImportColumnKey;
  label: string;
  required: boolean;
}[] = [
  { key: "date", label: "Date", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "name", label: "Name / description", required: false },
  { key: "category", label: "Category", required: false },
  { key: "card", label: "Card", required: false },
  { key: "type", label: "Type", required: false },
];

// Header-name patterns used to pre-fill the column mapping from the CSV.
const GUESS_PATTERNS: Record<ImportColumnKey, RegExp> = {
  date: /date|posted|time/i,
  amount: /amount|value|total|debit|credit|price/i,
  name: /name|description|payee|memo|merchant|detail/i,
  category: /category|group/i,
  card: /card|account/i,
  type: /type|kind/i,
};

type Mapping = Record<ImportColumnKey, number | null>;

const emptyMapping = (): Mapping => ({
  date: null,
  name: null,
  amount: null,
  category: null,
  card: null,
  type: null,
});

const guessMapping = (headers: string[]): Mapping => {
  const mapping = emptyMapping();
  (Object.keys(GUESS_PATTERNS) as ImportColumnKey[]).forEach((key) => {
    const idx = headers.findIndex((h) => GUESS_PATTERNS[key].test(h));
    if (idx >= 0) mapping[key] = idx;
  });
  return mapping;
};

export default function ImportTransactionsModal({
  isOpen,
  onClose,
  canImport,
}: ImportTransactionsModalProps) {
  const { data: budgets = [] } = useActiveBudgets();
  const previewMutation = useImportTransactionsPreview();
  const commitMutation = useImportTransactions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping());
  const [selectedBudgetId, setSelectedBudgetId] = useState("");
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setDataRows([]);
    setMapping(emptyMapping());
    setPreview([]);
    setExcluded(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Build the mapped raw rows from the CSV data using the current mapping.
  const buildRawRows = (): RawImportRow[] => {
    const cell = (row: string[], key: ImportColumnKey): string => {
      const idx = mapping[key];
      return idx != null ? (row[idx] ?? "") : "";
    };
    return dataRows.map((row) => ({
      date: cell(row, "date"),
      name: cell(row, "name"),
      amount: cell(row, "amount"),
      category: cell(row, "category"),
      card: cell(row, "card"),
      type: cell(row, "type"),
    }));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { headers: parsedHeaders, rows } = parseCsv(text);
      if (parsedHeaders.length === 0 || rows.length === 0) {
        toast.error("That file has no data rows to import.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFileName(file.name);
      setHeaders(parsedHeaders);
      setDataRows(rows);
      setMapping(guessMapping(parsedHeaders));
      setStep("map");
    } catch (err) {
      console.error("Failed to read CSV:", err);
      toast.error("Could not read that file. Make sure it's a CSV.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const missingRequired = REQUIRED_IMPORT_COLUMNS.filter(
    (key) => mapping[key] === null,
  );

  const handlePreview = () => {
    if (!selectedBudgetId) {
      toast.error("Select a budget to import into.");
      return;
    }
    if (missingRequired.length > 0) {
      toast.error("Map the date and amount columns first.");
      return;
    }

    previewMutation.mutate(
      { budgetId: selectedBudgetId, rows: buildRawRows() },
      {
        onSuccess: (data) => {
          setPreview(data.preview);
          // Default: exclude invalid rows (can't import) and duplicates
          // (avoid re-importing) — the user can re-include duplicates.
          const initialExcluded = new Set<number>();
          data.preview.forEach((r) => {
            if (!r.valid || r.duplicate) initialExcluded.add(r.index);
          });
          setExcluded(initialExcluded);
          setStep("preview");
        },
        onError: (error: unknown) => {
          if (error instanceof UpgradeRequiredError) {
            setUpgradeReason(error.message);
            return;
          }
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not preview the import.",
          );
        },
      },
    );
  };

  const toggleRow = (index: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const includedCount = useMemo(
    () => preview.filter((r) => r.valid && !excluded.has(r.index)).length,
    [preview, excluded],
  );

  const handleCommit = () => {
    const rawRows = buildRawRows();
    const rowsToImport = preview
      .filter((r) => r.valid && !excluded.has(r.index))
      .map((r) => rawRows[r.index]!)
      .filter(Boolean);

    if (rowsToImport.length === 0) {
      toast.error("Select at least one row to import.");
      return;
    }

    commitMutation.mutate(
      { budgetId: selectedBudgetId, rows: rowsToImport },
      {
        onSuccess: (data) => {
          toast.success(
            `Imported ${data.imported} transaction${
              data.imported === 1 ? "" : "s"
            }.`,
          );
          handleClose();
        },
        onError: (error: unknown) => {
          if (error instanceof UpgradeRequiredError) {
            setUpgradeReason(error.message);
            return;
          }
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not import the transactions.",
          );
        },
      },
    );
  };

  // Free users: show the paywall directly instead of the import flow.
  if (isOpen && !canImport) {
    return (
      <UpgradeModal
        isOpen={isOpen}
        onClose={handleClose}
        reason="Importing transactions from a CSV is a Premium feature. Upgrade to Premium to import your data."
      />
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen && upgradeReason === null}
        onClose={handleClose}
        title="Import transactions"
        maxWidth="max-w-3xl"
      >
        {step === "upload" && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              Upload a CSV exported from your bank, Mint, or YNAB. You&apos;ll
              map the columns and review every row before anything is saved.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 py-12 text-center transition-colors duration-200 hover:border-secondary hover:bg-surface"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-secondary-600">
                <FileUp className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-gray-900">
                Choose a CSV file
              </span>
              <span className="text-xs text-gray-500">
                We&apos;ll never store your file — it&apos;s parsed in your
                browser.
              </span>
            </button>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileUp className="h-4 w-4 shrink-0" />
              <span className="truncate">{fileName}</span>
              <span className="shrink-0 text-gray-400">
                · {dataRows.length} row{dataRows.length === 1 ? "" : "s"}
              </span>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Import into budget <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">Select an active budget</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
              {budgets.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  You need an active budget before importing.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                Map your columns
              </p>
              {COLUMN_META.map(({ key, label, required }) => (
                <div
                  key={key}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="text-sm text-gray-700">
                    {label}
                    {required && <span className="text-red-500"> *</span>}
                  </span>
                  <select
                    value={mapping[key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [key]:
                          e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:w-64"
                  >
                    <option value="">
                      {required ? "Select a column" : "Not mapped"}
                    </option>
                    {headers.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {header || `Column ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={reset}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Choose another file
              </Button>
              <Button
                onClick={handlePreview}
                isLoading={previewMutation.isPending}
                disabled={
                  !selectedBudgetId ||
                  missingRequired.length > 0 ||
                  previewMutation.isPending
                }
              >
                Preview import
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 font-medium text-green-700">
                {includedCount} to import
              </span>
              {preview.some((r) => r.duplicate) && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700">
                  {preview.filter((r) => r.duplicate).length} possible duplicate
                  {preview.filter((r) => r.duplicate).length === 1 ? "" : "s"}
                </span>
              )}
              {preview.some((r) => !r.valid) && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 font-medium text-red-700">
                  {preview.filter((r) => !r.valid).length} can&apos;t import
                </span>
              )}
            </div>

            <div className="max-h-[50vh] overflow-y-auto overscroll-contain rounded-xl border border-gray-200/70">
              <div className="divide-y divide-gray-100">
                {preview.map((row) => {
                  const isIncluded = row.valid && !excluded.has(row.index);
                  return (
                    <div
                      key={row.index}
                      className={`flex items-start gap-3 p-3 ${
                        row.valid ? "" : "bg-red-50/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        disabled={!row.valid}
                        onChange={() => toggleRow(row.index)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-secondary-600 focus:ring-secondary disabled:opacity-40"
                        aria-label={`Include row ${row.index + 1}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {row.name || "Unnamed transaction"}
                          </span>
                          {row.duplicate && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              Duplicate
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.matchedCategoryId
                                ? "bg-secondary/15 text-secondary-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {row.matchedCategoryName ??
                              (row.categoryName
                                ? `${row.categoryName} (uncategorized)`
                                : "Uncategorized")}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                          <span>{row.occurredAt ?? (row.rawDate || "—")}</span>
                          <span className="capitalize">
                            {row.transactionType
                              .toLowerCase()
                              .replace("_", " ")}
                          </span>
                        </div>
                        {row.errors.length > 0 && (
                          <p className="mt-1 text-xs text-red-600">
                            {row.errors.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                        {row.amount !== null
                          ? formatCurrency(Math.abs(row.amount))
                          : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep("map")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to mapping
              </Button>
              <Button
                onClick={handleCommit}
                isLoading={commitMutation.isPending}
                disabled={includedCount === 0 || commitMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import {includedCount} transaction
                {includedCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <UpgradeModal
        isOpen={upgradeReason !== null}
        onClose={() => {
          setUpgradeReason(null);
          handleClose();
        }}
        reason={upgradeReason ?? undefined}
      />
    </>
  );
}
