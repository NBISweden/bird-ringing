import { useState, useCallback, ChangeEventHandler, useRef, useEffect } from "react";

export function useItemSelections(currentSubSet: Set<string>, attributeId: string = "data-actor-id") {
  const [selectedItems, setSelectedItems] = useState(new Set<string>());
  const handleItemSelection = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const actorId = event.target.getAttribute(attributeId);
    const checked = event.target.checked;
    if (actorId) {
      if (checked) {
        setSelectedItems((prev) => {
          const next = new Set(prev);
          next.add(actorId);
          return next;
        })
      } else {
        setSelectedItems((prev) => {
          const next = new Set(prev);
          next.delete(actorId);
          return next;
        })
      }
    }
  }, [setSelectedItems, attributeId]);
  const allSelected = selectedItems.isSupersetOf(currentSubSet);
  const toggleItems = useCallback<() => void>(() => {
    const nextItems = allSelected ? selectedItems.difference(currentSubSet) : selectedItems.union(currentSubSet)
    setSelectedItems(nextItems);
  }, [selectedItems, setSelectedItems, allSelected, currentSubSet]);

  return {
    selectedItems,
    setSelectedItems,
    toggleItems,
    handleItemSelection,
    allSelected
  }
}

export function useDebouncedValue<T>(value: T, timeout: number = 5000) {
  const [activeValue, setActiveValue] = useState<T>(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setTimeout(() => {
      setActiveValue(value);
    }, timeout);
  }, [value, setActiveValue, timeout, timerRef]);
  return activeValue;
}
export function useFilter(items: SearchableItem[]) {
  const [filter, setFilter] = useState<string>("");
  const filterItems = filter.split(/\s+/).map(i => i.toLowerCase())
  const filteredItems = items
    .filter(r => Object.values(r.properties).some(value => filterItems.some(fi => value.term.toLowerCase().includes(fi))));
  return {
    filteredItems,
    setFilter,
    filter,
  }
}

export type SearchableItem = {
  id: string;
  properties: Record<string, {
    term: React.ReactNode
    component: React.ReactNode;
  }>
}
