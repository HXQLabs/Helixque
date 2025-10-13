"use client";
import { use } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    // Redirect to match page with roomId
    router.push(`/match?roomId=${resolvedParams.roomId}`);
  }, [resolvedParams.roomId, router]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Joining room...</h1>
        <p className="text-muted-foreground">Redirecting to device setup...</p>
      </div>
    </div>
  );
}