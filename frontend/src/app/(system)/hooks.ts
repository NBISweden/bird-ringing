import {
  useState,
  useCallback,
  ChangeEventHandler,
  useRef,
  useEffect,
} from "react";
import useSWRMutation from "swr/mutation";
import { useModalsContext } from "./contexts";
import { useTranslation } from "./internationalization";

export function useItemSelections(
  currentSubSet: Set<string>,
  attributeId: string,
) {
  const [selectedItems, setSelectedItems] = useState(new Set<string>());
  const handleItemSelection = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const id = event.target.getAttribute(attributeId);
      const checked = event.target.checked;
      if (id) {
        if (checked) {
          setSelectedItems((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        } else {
          setSelectedItems((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
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

export function useActionWithoutCache<T>(
  SWRKey: string,
  action: () => Promise<T>,
) {
  const hasSent = useRef(false);
  const { data, isMutating, trigger, error } = useSWRMutation(SWRKey, action, {
    populateCache: false,
    revalidate: false,
  });
  useEffect(() => {
    if (hasSent.current) return;
    hasSent.current = true;
    trigger();
  });

  return { data, isLoading: isMutating, error };
}

export function useObjectState<T extends object>(
  initialValue: T,
): [T, (delta: Partial<T>) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const updateValue = useCallback(
    (delta: Partial<T>) => {
      setValue((prev) => {
        return {
          ...prev,
          ...delta,
        };
      });
    },
    [setValue],
  );

  return [value, updateValue];
}

export function useNotImplementedModal() {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  const action = useCallback(
    (title?: string) => {
      modalStack.add({
        title: title || t("featureNotImplemented"),
        content: t("featureNotImplemented"),
        actions: [
          {
            label: t("closeModal"),
            action: () => {},
            type: "primary",
          },
        ],
      });
    },
    [modalStack, t],
  );
  return action;
}
