import { useEffect, useState } from "react";

function target(offerEnd?: string) {
  if (offerEnd) {
    const d = new Date(offerEnd);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function Countdown({ offerEnd }: { offerEnd?: string }) {
  const [label, setLabel] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target(offerEnd).getTime() - Date.now());
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setLabel(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offerEnd]);

  return <span className="font-mono font-bold tracking-wider">{label}</span>;
}
