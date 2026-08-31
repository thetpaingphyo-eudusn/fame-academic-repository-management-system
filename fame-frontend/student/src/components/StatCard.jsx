import React from "react";
import IconGlass from "./IconGlass";

const ICON_COLORS = {
  blue: "text-blue-500",
  green: "text-green-500",
  purple: "text-purple-500",
  pink: "text-pink-500",
  emerald: "text-emerald-500",
  indigo: "text-indigo-500",
  rose: "text-rose-500",
  amber: "text-amber-500",
  sky: "text-sky-500",
  violet: "text-violet-500",
  teal: "text-teal-500",
  orange: "text-orange-500",
  yellow: "text-yellow-600",
};

const StatCard = ({
  label,
  value,
  note,
  icon: Icon,
  iconColor = "emerald",
  cardClass = "cute-card p-4",
  onClick,
  className = "",
}) => {
  const Tag = onClick ? "button" : "div";
  const colorClass = ICON_COLORS[iconColor] || iconColor;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`${cardClass} text-left ${onClick ? "hover:scale-[1.01] transition-transform" : ""} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
        </div>
        {Icon && (
          <IconGlass size="md" interactive className={colorClass}>
            <Icon size={20} />
          </IconGlass>
        )}
      </div>
    </Tag>
  );
};

export default StatCard;
