import { useEffect } from "react";
import SurvivorTool from "../../tools/survivor/ui/SurvivorTool";

export default function SurvivorPage() {
  useEffect(() => {
    document.title = "NFL Survivor Grid · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <SurvivorTool />;
}
