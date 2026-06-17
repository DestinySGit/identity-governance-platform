"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { runRiskAnalysis } from "@/app/actions/governance";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RiskAnalysisButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    setLoading(true);
    await runRiskAnalysis();
    router.refresh();
    setLoading(false);
  }

  return (
    <Button onClick={handleRun} disabled={loading}>
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Analyzing..." : "Re-run Analysis"}
    </Button>
  );
}
