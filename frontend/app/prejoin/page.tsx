"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"; // adjust the import path if your shadcn Button is in a different place

export default function PrejoinHome() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-sm mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">Welcome to Helixque</h1>
        <p className="mb-8 text-center text-base text-neutral-300">
          Your professional networking video platform.<br />Connect, chat, and build meaningful relationships.
        </p>
<div className="flex justify-center mt-8">
  <Button
    variant="outline"
    className="font-semibold border-2 border-white transition-colors hover:bg-white hover:text-black hover:border-white cursor-pointer"
    onClick={() => router.push("/prejoin/username")}
  >
    Get Started
  </Button>
</div>

      </div>
    </div>
  );
}

