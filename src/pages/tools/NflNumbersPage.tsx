import { useEffect } from "react";
import NflNumbersTool from "../../tools/nfl-numbers/ui/NflNumbersTool";

export default function NflNumbersPage() {
  useEffect(() => {
    document.title = "NFL Key Numbers & Trends · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <NflNumbersTool />;
}
