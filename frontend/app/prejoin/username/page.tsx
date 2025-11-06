"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PrejoinUsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (username.trim().length === 0) {
      setError("Please enter a valid username");
      return;
    }
    setError("");
    router.push(`/prejoin/devicecheck?username=${encodeURIComponent(username.trim())}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-black text-white">
      <div className="w-full max-w-md bg-black rounded-2xl border border-white/20 shadow-xl p-8">
        <h1 className="text-3xl font-semibold mb-6 text-center">Enter your username</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 border-2 border-white/30 bg-black text-white rounded-md focus:outline-none focus:border-white focus:ring-2 focus:ring-white/80 transition"
          autoFocus
        />
        {error && <p className="mt-2 text-red-500">{error}</p>}
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="mt-6 font-semibold border-2 border-white transition-colors hover:bg-white hover:text-black hover:border-white cursor-pointer"
            onClick={handleContinue}
            disabled={username.trim().length === 0}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

