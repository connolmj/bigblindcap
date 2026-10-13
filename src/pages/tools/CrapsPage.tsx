import { useEffect } from "react";
import CrapsTrainer from "../../tools/craps/ui/CrapsTrainer";

export default function CrapsPage() {
  useEffect(() => {
    document.title = "Craps Strategy · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <CrapsTrainer />;
}
