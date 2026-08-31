import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const ChatChart = ({ chart }) => {
  if (!chart?.data?.length) return null;

  const palette = chart.colors?.length ? chart.colors : ["#8b5cf6", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];
  const nameKey = chart.nameKey || "name";
  const dataKey = chart.dataKey || "value";

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  };

  const renderBody = () => {
    if (chart.type === "pie") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={72}
              paddingAngle={2}
            >
              {chart.data.map((entry, index) => (
                <Cell key={`${entry[nameKey]}-${index}`} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === "line") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chart.data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey={dataKey} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chart.data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
            {chart.data.map((entry, index) => (
              <Cell key={`${entry[nameKey]}-${index}`} fill={palette[index % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="mt-2 rounded-xl border border-violet-100 bg-white/90 p-3 shadow-sm">
      <p className="text-xs font-semibold text-gray-800 mb-0.5">{chart.title}</p>
      {chart.description ? <p className="text-[10px] text-gray-500 mb-2">{chart.description}</p> : null}
      {renderBody()}
    </div>
  );
};

export default ChatChart;
