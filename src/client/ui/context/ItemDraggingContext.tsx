// Provides context for item transfer
import { createContext, ReactNode, useContext, useState } from "@rbxts/react";
import React from "@rbxts/react";

interface DragState {
    originSlot: string;
    itemUuid: string;
}

type ItemDraggingContextType = {
  dragState: DragState | undefined;
  setDragState: React.Dispatch<React.SetStateAction<DragState | undefined>>;
};

const ItemDraggingContext = createContext<ItemDraggingContextType | undefined>(undefined);

export function ItemProvider(props: { children: ReactNode }) {
    const [dragState, setDragState] = useState<DragState | undefined>()

    return (
        <ItemDraggingContext.Provider value={{dragState, setDragState}}>
          {props.children}
        </ItemDraggingContext.Provider>
    )
}

export function useItemDragging() {
  const ctx = useContext(ItemDraggingContext);
  if (!ctx) error("useItemDragging must be used within ItemProvider");

  return ctx;
}
