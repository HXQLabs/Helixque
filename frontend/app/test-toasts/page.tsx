"use client";
import { toast } from "sonner";
import ThemeToggle from "@/components/theme-toggle";

export default function TestToastsPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-8 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-foreground text-center mb-8">Toast Test Page</h1>
        
        <button
          onClick={() => toast.success("Success!", { description: "This is a success message" })}
          className="w-full h-12 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors shadow-sm"
        >
          Test Success Toast
        </button>
        
        <button
          onClick={() => toast.error("Error!", { description: "This is an error message" })}
          className="w-full h-12 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors shadow-sm"
        >
          Test Error Toast
        </button>
        
        <button
          onClick={() => toast.warning("Warning!", { description: "This is a warning message" })}
          className="w-full h-12 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors shadow-sm"
        >
          Test Warning Toast
        </button>
        
        <button
          onClick={() => toast("Info", { description: "This is an info message" })}
          className="w-full h-12 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors shadow-sm"
        >
          Test Info Toast
        </button>
      </div>
    </div>
  );
}
