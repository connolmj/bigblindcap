import { useEffect } from "react";
import BankrollTool from "../../tools/bankroll/ui/BankrollTool";

export default function BankrollPage() {
  useEffect(() => {
    document.title = "Edge vs. Variance · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <BankrollTool />;
}
