import { useEffect } from "react";
import CountingTrainer from "../../tools/counting/ui/CountingTrainer";

export default function CardCountingPage() {
  useEffect(() => {
    document.title = "Blackjack Card Counting · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <CountingTrainer />;
}
