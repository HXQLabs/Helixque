"use client";
import { useState } from "react";

export default function Tooltip({ children, content, position = "top" }: { children: React.ReactNode, content: string, position?: "top" | "bottom" | "left" | "right" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`
            absolute whitespace-nowrap rounded-md bg-black/80 text-white/70 text-[12px] px-2 py-1 
            ${position === "top" ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : ""}
            ${position === "bottom" ? "top-full mt-2 left-1/2 -translate-x-1/2" : ""}
            ${position === "left" ? "right-full mr-2 top-1/2 -translate-y-1/2" : ""}
            ${position === "right" ? "left-full ml-2 top-1/2 -translate-y-1/2" : ""}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
}
