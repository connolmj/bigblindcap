import { useEffect } from "react";
import SquaresTool from "../../tools/squares/ui/SquaresTool";

export default function SquaresPage() {
  useEffect(() => {
    document.title = "Super Bowl Squares · Big Blind Capital";
    return () => {
      document.title = "Big Blind Capital";
    };
  }, []);
  return <SquaresTool />;
}
