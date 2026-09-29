import { useEffect } from "react";
import SportsBettingBasics from "../../learn/sports-betting/ui/SportsBettingBasics";

export default function SportsBettingBasicsPage() {
  useEffect(() => {
    document.title = "Sports Betting Basics · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <SportsBettingBasics />;
}
