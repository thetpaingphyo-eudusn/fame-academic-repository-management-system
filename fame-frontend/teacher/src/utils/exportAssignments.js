import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const HEADERS = [
  "Assignment Title",
  "Status",
  "Open Date",
  "Due Date",
  "Submissions",
  "Pending",
  "Graded",
  "Average Grade"
];

export const buildAssignmentExportRows = (assignments, getStatusLabel) =>
  assignments.map((a) => [
    a.title || "",
    getStatusLabel(a),
    a.openDate ? new Date(a.openDate).toLocaleDateString("en-US") : "",
    a.dueDate ? new Date(a.dueDate).toLocaleDateString("en-US") : "",
    a.submissionCount ?? 0,
    a.pendingCount ?? 0,
    a.gradedCount ?? 0,
    a.avgGrade != null ? `${a.avgGrade}%` : "—"
  ]);

const escapeCsvCell = (value) => {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const timestamp = () => new Date().toISOString().slice(0, 10);

export const exportAssignments = (format, assignments, options = {}) => {
  if (!assignments.length) return false;

  const getStatusLabel = options.getStatusLabel || (() => "");
  const rows = buildAssignmentExportRows(assignments, getStatusLabel);
  const prefix = options.filenamePrefix || "assignments";
  const courseName = options.courseName || "Course";

  if (format === "csv") {
    const csv = [HEADERS, ...rows].map((r) => r.map(escapeCsvCell).join(",")).join("\n");
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `${prefix}_${timestamp()}.csv`);
    return true;
  }

  if (format === "excel") {
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
    ws["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assignments");
    XLSX.writeFile(wb, `${prefix}_${timestamp()}.xlsx`);
    return true;
  }

  if (format === "pdf") {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(16);
    doc.text(`Assignments — ${courseName}`, 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 23);
    doc.text(`Total: ${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`, 14, 28);
    doc.setTextColor(0);
    autoTable(doc, {
      head: [HEADERS],
      body: rows,
      startY: 33,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
    doc.save(`${prefix}_${timestamp()}.pdf`);
    return true;
  }

  return false;
};
