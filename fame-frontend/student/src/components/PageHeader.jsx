import React from "react";
import IconGlass from "./IconGlass";

const PageHeader = ({ title, subtitle, icon: Icon, iconColor = "text-emerald-500", iconTone, iconClassName, children }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div className="flex items-start gap-3 min-w-0">
      {Icon && (
        <IconGlass size="md" interactive tone={iconTone || "light"} className={iconClassName || iconColor}>
          <Icon size={20} />
        </IconGlass>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        {subtitle && <div className="text-gray-500 text-sm mt-1">{subtitle}</div>}
      </div>
    </div>
    {children && <div className="flex flex-wrap gap-2 shrink-0">{children}</div>}
  </div>
);

export default PageHeader;
