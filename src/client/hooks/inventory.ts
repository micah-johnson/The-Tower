import { useEffect, useState } from "@rbxts/react";
import { inventoryManager } from "../inventory/manager";

export function useInventoryVersion() {
  const [v, setV] = useState(inventoryManager.getVersion());
  
  useEffect(() => {
    const conn = inventoryManager.changed.Connect(setV);
    return () => { conn.Disconnect() };
  }, []);

  return v;
}