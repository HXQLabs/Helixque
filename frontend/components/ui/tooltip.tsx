"use client";
import { useState } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end"; // New 'align' prop
}

export default function Tooltip({
  children,
  content,
  position = "top",
  align = "center", // Default to center
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  // Define alignment classes based on the new prop
  const alignmentClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <div
        className={`
          absolute whitespace-nowrap w-max rounded-md bg-black/80 text-white/90 text-xs px-2 py-1 z-10
          transition-opacity duration-200 pointer-events-none 
          ${visible ? "opacity-100" : "opacity-0"}
          ${
            position === "top"
              ? `bottom-full mb-2 ${alignmentClasses[align]}`
              : ""
          }
          ${
            position === "bottom"
              ? `top-full mt-2 ${alignmentClasses[align]}`
              : ""
          }
          ${
            position === "left"
              ? "right-full mr-2 top-1/2 -translate-y-1/2"
              : ""
          }
          ${
            position === "right"
              ? "left-full ml-2 top-1/2 -translate-y-1/2"
              : ""
          }
        `}
      >
        {content}
      </div>
    </div>
  );
}
