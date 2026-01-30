import {
  useState,
  useCallback,
  ChangeEventHandler,
  useRef,
  useEffect,
} from "react";

export function useItemSelections(currentSubSet: Set<string>, attributeId: string) {
  const [selectedItems, setSelectedItems] = useState(new Set<string>());
  const handleItemSelection = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const id = event.target.getAttribute(attributeId);
    const checked = event.target.checked;
    if (id) {
      if (checked) {
        setSelectedItems((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        })
      } else {
        setSelectedItems((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        })
      }
    },
    [setSelectedItems, attributeId],
  );
  const allSelected = selectedItems.isSupersetOf(currentSubSet);
  const toggleItems = useCallback<() => void>(() => {
    const nextItems = allSelected
      ? selectedItems.difference(currentSubSet)
      : selectedItems.union(currentSubSet);
    setSelectedItems(nextItems);
  }, [selectedItems, setSelectedItems, allSelected, currentSubSet]);

  return {
    selectedItems,
    setSelectedItems,
    toggleItems,
    handleItemSelection,
    allSelected,
  };
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
