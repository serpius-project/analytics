"use client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toCsv, downloadCsv } from "@/lib/csvExport";

interface CsvExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
}

export function CsvExportButton({ data, filename, label = "Download CSV" }: CsvExportButtonProps) {
  function handleClick() {
    const csv = toCsv(data);
    downloadCsv(csv, filename);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={data.length === 0}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
