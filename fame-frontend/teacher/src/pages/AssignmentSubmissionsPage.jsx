import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assignmentAPI, projectAPI } from "../services/api";
import {
  getStudentName,
  getStudentRollId
} from "../utils/projectHelpers";
import { exportSubmissions } from "../utils/exportSubmissions";

import GradingCriteriaModal from "../components/GradingCriteriaModal";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  FileText, Calendar, Download, Eye,
  RefreshCw, Loader, Search, ChevronLeft,
  FileSpreadsheet, FileType, ChevronDown,
  Star, Clock, CheckCircle
} from "lucide-react";

const AssignmentSubmissionsPage = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSubmissions(submissions);
      return;
    }
    const q = searchTerm.toLowerCase();
    setFilteredSubmissions(
      submissions.filter(
        (s) =>
          getStudentName(s).toLowerCase().includes(q) ||
          getStudentRollId(s).toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q)
      )
    );
  }, [submissions, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentRes, projectsRes] = await Promise.all([
        assignmentAPI.getAssignmentById(assignmentId),
        projectAPI.getMyProjects({ assignmentId, limit: 200 })
      ]);
      setAssignment(assignmentRes.data.data);
      const list = projectsRes.data.data || [];
      setSubmissions(list);
      setFilteredSubmissions(list);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    if (!filteredSubmissions.length) {
      alert("No submissions to export.");
      return;
    }
    setShowExportMenu(false);
    exportSubmissions(format, filteredSubmissions, {
      filenamePrefix: `assignment_${assignmentId?.slice(-6)}`,
      title: `Submissions — ${assignment?.title || "Assignment"}`,
      teacherName: "Teacher"
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-amber-100 text-amber-700",
      submitted: "bg-blue-100 text-blue-700",
      graded: "bg-purple-100 text-purple-700",
      revision: "bg-sky-100 text-sky-700",
      approved: "bg-emerald-100 text-emerald-700",
      rejected: "bg-red-100 text-red-700"
    };
    return badges[status] || "bg-gray-100 text-gray-600";
  };

  const formatStatusText = (status) => {
    const map = {
      pending: "Awaiting Review",
      submitted: "Submitted",
      graded: "Graded",
      revision: "Revision Required",
      approved: "Approved",
      rejected: "Rejected"
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const gradedCount = submissions.filter((s) => s.grade != null).length;

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-500 text-sm mb-2 hover:underline flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <PageHeader
          title={assignment?.title || "Assignment Submissions"}
          subtitle={
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Due: {assignment?.dueDate ? new Date(assignment.dueDate).toLocaleDateString("en-US") : "—"}
            </span>
          }
          icon={FileText}
        >
          <button
            onClick={loadData}
            className="px-3 py-2 border rounded-xl text-sm flex items-center gap-1 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={!filteredSubmissions.length}
              className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Download size={14} /> Export <ChevronDown size={12} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-1 z-20">
                  <button onClick={() => handleExport("csv")} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <FileText size={14} /> CSV
                  </button>
                  <button onClick={() => handleExport("excel")} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                  <button onClick={() => handleExport("pdf")} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <FileType size={14} /> PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </PageHeader>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={submissions.length} icon={FileText} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Graded" value={gradedCount} icon={Star} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Pending Review" value={pendingCount} icon={Clock} iconColor="amber" cardClass="cute-card cute-card-amber p-4" />
        <StatCard
          label="Approved"
          value={submissions.filter((s) => s.status === "approved").length}
          icon={CheckCircle}
          iconColor="green"
          cardClass="cute-card cute-card-green p-4"
        />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by student or project title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubmissions.map((submission) => (
                <tr key={submission._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{getStudentName(submission)}</p>
                    <p className="text-xs text-gray-400">{getStudentRollId(submission)}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 line-clamp-1 max-w-[200px]">
                    {submission.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {submission.submittedAt
                      ? new Date(submission.submittedAt).toLocaleDateString("en-US")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(submission.status)}`}>
                      {formatStatusText(submission.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {submission.grade != null ? (
                      <span className="text-sm font-semibold text-purple-600">{submission.grade}%</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/submissions?project=${submission._id}`)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowGradeModal(true);
                        }}
                        className="px-2 py-1 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600"
                      >
                        Grade
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSubmissions.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No submissions for this assignment yet</p>
          </div>
        )}
      </div>

      {showGradeModal && selectedSubmission && (
        <GradingCriteriaModal
          project={selectedSubmission}
          onClose={() => {
            setShowGradeModal(false);
            setSelectedSubmission(null);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default AssignmentSubmissionsPage;
