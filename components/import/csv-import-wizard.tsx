"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { executeImport } from "@/app/actions/import";
import {
  csvUserSchema,
  csvRoleSchema,
  csvGroupSchema,
  csvApplicationSchema,
  csvEntitlementSchema,
  type ImportType,
} from "@/schemas/identity.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import type { ImportSummary } from "@/app/actions/import";
import { z } from "zod";

const IMPORT_TYPES: { value: ImportType; label: string }[] = [
  { value: "users", label: "Users" },
  { value: "roles", label: "Roles" },
  { value: "groups", label: "Groups" },
  { value: "applications", label: "Applications" },
  { value: "entitlements", label: "User Entitlements" },
];

const SCHEMAS: Record<ImportType, z.ZodSchema> = {
  users: csvUserSchema,
  roles: csvRoleSchema,
  groups: csvGroupSchema,
  applications: csvApplicationSchema,
  entitlements: csvEntitlementSchema,
};

type Step = "select" | "preview" | "summary";

interface ValidatedRow {
  row: number;
  data: Record<string, unknown>;
  valid: boolean;
  errors: string[];
}

export function CsvImportWizard() {
  const [step, setStep] = useState<Step>("select");
  const [importType, setImportType] = useState<ImportType>("users");
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const schema = SCHEMAS[importType];
          const validated: ValidatedRow[] = results.data.map((row, index) => {
            const parsed = schema.safeParse(row);
            return {
              row: index + 2,
              data: parsed.success ? parsed.data : row,
              valid: parsed.success,
              errors: parsed.success
                ? []
                : parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
            };
          });
          setValidatedRows(validated);
          setStep("preview");
        },
      });
    },
    [importType]
  );

  async function handleImport() {
    setLoading(true);
    const validRows = validatedRows.filter((r) => r.valid).map((r) => r.data);
    const result = await executeImport(importType, validRows);
    if (result.summary) {
      setSummary(result.summary);
      setStep("summary");
    }
    setLoading(false);
  }

  const validCount = validatedRows.filter((r) => r.valid).length;
  const errorCount = validatedRows.filter((r) => !r.valid).length;

  return (
    <div className="space-y-6">
      {step === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Import Type</label>
              <Select
                value={importType}
                onValueChange={(v) => setImportType(v as ImportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drop a CSV file or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview: {fileName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="success">
                <CheckCircle className="h-3 w-3 mr-1" />
                {validCount} valid
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errorCount} errors
                </Badge>
              )}
            </div>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validatedRows.slice(0, 50).map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell>
                        <Badge variant={row.valid ? "success" : "destructive"}>
                          {row.valid ? "Valid" : "Invalid"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs">
                        {JSON.stringify(row.data)}
                      </TableCell>
                      <TableCell className="text-xs text-destructive">
                        {row.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {validatedRows.length > 50 && (
              <p className="text-sm text-muted-foreground">
                Showing first 50 of {validatedRows.length} rows
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={loading || validCount === 0}>
                {loading ? "Importing..." : `Import ${validCount} rows`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "summary" && summary && (
        <Card>
          <CardHeader>
            <CardTitle>Import Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{summary.created}</p>
                <p className="text-sm text-emerald-600">Created</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{summary.updated}</p>
                <p className="text-sm text-blue-600">Updated</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{summary.skipped}</p>
                <p className="text-sm text-amber-600">Skipped</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{summary.errors}</p>
                <p className="text-sm text-red-600">Errors</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setStep("select");
                setSummary(null);
                setValidatedRows([]);
              }}
            >
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
