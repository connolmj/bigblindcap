import { useEffect } from "react";
import BlackjackTrainer from "../../games/blackjack/ui/BlackjackTrainer";

export default function BlackjackPage() {
  useEffect(() => {
    document.title = "Level 1: Basic Blackjack Strategy · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <BlackjackTrainer />;
}
