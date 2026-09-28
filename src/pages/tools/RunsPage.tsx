import { useEffect } from "react";
import RunsTool from "../../tools/runs/ui/RunsTool";

export default function RunsPage() {
  useEffect(() => {
    document.title = "Run Scoring Odds · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <RunsTool />;
}
