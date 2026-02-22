"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ImportResult {
  imported: number;
  notes: Array<{ id: string; title: string }>;
}

export default function ClickUpImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/clickup", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (res.ok) {
        setResult(json.data);
        toast.success(`Imported ${json.data.imported} notes!`);
      } else {
        setError(json.error || "Import failed");
        toast.error(json.error || "Import failed");
      }
    } catch {
      setError("Failed to import file");
      toast.error("Failed to import file");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">ClickUp Import</h1>
      <p className="text-muted-foreground">
        Import your ClickUp tasks and notes into the dashboard. Upload a CSV or
        JSON export file from ClickUp. Items will be imported as notes.
      </p>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">
                  Drop your ClickUp export here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV and JSON formats
                </p>
              </div>
            )}
          </div>

          {file && !result && (
            <div className="flex gap-3 mt-4">
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : "Import"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">Import Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className="border-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">
                    Import Successful
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.imported} note{result.imported !== 1 ? "s" : ""}{" "}
                    imported from ClickUp.
                  </p>
                </div>
                {result.notes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Imported Notes:</p>
                    <ul className="text-sm text-muted-foreground space-y-0.5">
                      {result.notes.slice(0, 20).map((note) => (
                        <li key={note.id}>
                          <button
                            className="text-primary hover:underline"
                            onClick={() =>
                              router.push(`/dashboard/notes/${note.id}`)
                            }
                          >
                            {note.title}
                          </button>
                        </li>
                      ))}
                      {result.notes.length > 20 && (
                        <li className="text-xs">
                          ...and {result.notes.length - 20} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/dashboard/notes")}
                >
                  View All Notes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
