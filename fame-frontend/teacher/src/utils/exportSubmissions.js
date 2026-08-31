import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getAssignmentTitle,
  getCourseName,
  getStudentName,
  getStudentRollId
} from "./projectHelpers";

const STATUS_LABELS = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  revision: "Revision Needed",
  graded: "Graded"
};

const HEADERS = [
  "Project Title",
  "Student Name",
  "Student ID",
  "Course",
  "Assignment",
  "Status",
  "Grade",
  "Submitted Date"
];

export const buildSubmissionExportRows = (projects) =>
  projects.map((p) => [
    p.title || "",
    getStudentName(p),
    getStudentRollId(p),
    getCourseName(p),
    getAssignmentTitle(p),
    STATUS_LABELS[p.status] || p.status || "",
    p.grade != null ? `${p.grade}%` : "Not Graded",
    p.submittedAt ? new Date(p.submittedAt).toLocaleDateString("en-US") : ""
  ]);

const escapeCsvCell = (value) => {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
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

export const exportSubmissionsCSV = (projects, filenamePrefix = "submissions") => {
  if (!projects.length) return false;
  const rows = buildSubmissionExportRows(projects);
  const csv = [HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filenamePrefix}_${timestamp()}.csv`);
  return true;
};

export const exportSubmissionsExcel = (projects, filenamePrefix = "submissions") => {
  if (!projects.length) return false;
  const rows = buildSubmissionExportRows(projects);
  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  worksheet["!cols"] = [
    { wch: 32 }, { wch: 22 }, { wch: 14 }, { wch: 24 },
    { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 14 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
  XLSX.writeFile(workbook, `${filenamePrefix}_${timestamp()}.xlsx`);
  return true;
};

export const exportSubmissionsPDF = (projects, options = {}) => {
  if (!projects.length) return false;

  const { title = "Project Submissions Report", teacherName = "Teacher" } = options;
  const rows = buildSubmissionExportRows(projects);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 23);
  doc.text(`Teacher: ${teacherName}`, 14, 28);
  doc.text(`Total records: ${projects.length}`, 14, 33);
  doc.setTextColor(0);

  autoTable(doc, {
    head: [HEADERS],
    body: rows,
    startY: 38,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${options.filenamePrefix || "submissions"}_${timestamp()}.pdf`);
  return true;
};

export const exportSubmissions = (format, projects, options = {}) => {
  switch (format) {
    case "csv":
      return exportSubmissionsCSV(projects, options.filenamePrefix);
    case "excel":
      return exportSubmissionsExcel(projects, options.filenamePrefix);
    case "pdf":
      return exportSubmissionsPDF(projects, options);
    default:
      return false;
  }
};
