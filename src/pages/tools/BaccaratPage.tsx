import { useEffect } from "react";
import BaccaratTrainer from "../../tools/baccarat/ui/BaccaratTrainer";

export default function BaccaratPage() {
  useEffect(() => {
    document.title = "Baccarat Strategy · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <BaccaratTrainer />;
}
