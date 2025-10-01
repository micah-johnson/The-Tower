import { useEffect, useState } from "@rbxts/react";
import { playerInventory } from "../inventory";

export function useInventoryVersion() {
  const [v, setV] = useState(playerInventory.getVersion());
  
  useEffect(() => {
    const conn = playerInventory.changed.Connect(setV);
    return () => { conn.Disconnect() };
  }, []);

  return v;
}