import { useEffect } from "react";
import ThreeCardTrainer from "../../tools/three-card/ui/ThreeCardTrainer";

export default function ThreeCardPokerPage() {
  useEffect(() => {
    document.title = "Three Card Poker Strategy · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <ThreeCardTrainer />;
}
