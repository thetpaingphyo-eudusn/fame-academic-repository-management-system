import React from "react";

const SIZE_CLASS = {
  sm: "icon-glass--sm",
  md: "icon-glass--md",
  lg: "icon-glass--lg",
};

const IconGlass = ({
  children,
  size = "sm",
  tone = "light",
  interactive = false,
  className = "",
}) => (
  <span
    className={[
      "icon-glass",
      SIZE_CLASS[size] || SIZE_CLASS.sm,
      tone === "dark" ? "icon-glass--dark" : "",
      interactive ? "icon-glass--interactive" : "",
      className,
    ].filter(Boolean).join(" ")}
  >
    {children}
  </span>
);

export default IconGlass;
