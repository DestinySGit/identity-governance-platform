"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { captureGovernanceSnapshot } from "@/app/actions/governance";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

export function CaptureSnapshotButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCapture() {
    setLoading(true);
    setMessage(null);

    const result = await captureGovernanceSnapshot();
    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(`Snapshot saved for ${result.data?.snapshot_date}`);
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={handleCapture} disabled={loading}>
        <Camera className={`h-4 w-4 mr-2 ${loading ? "animate-pulse" : ""}`} />
        {loading ? "Capturing..." : "Capture Snapshot"}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
