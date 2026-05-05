import {
  useState,
  useCallback,
  useId,
  ChangeEventHandler,
  MouseEventHandler,
  useMemo,
} from "react";
import Icon from "./Icon";

export function MultiSelectField<T>({
  name,
  value,
  options,
  onChange,
  filterText,
  maxSelections,
  baseColumns,
  minified,
}: {
  name: string;
  value: T[];
  options: { value: T; label: string }[];
  onChange?: (value: T[]) => void;
  maxSelections?: number;
  filterText?: string;
  baseColumns?: 1 | 2 | 3;
  minified?: boolean;
}) {
  const fieldId = useId();
  const filterCheckedId = useId();
  const [filterValue, setFilterValue] = useState<string | undefined>();
  const [filterChecked, setFilterChecked] = useState<boolean>(false);
  const [current, setCurrent] = useState<T[]>(value);
  const usedValue = useMemo(() => {
    const allValuesSet = new Set(options.map((v) => v.value));
    const nextValue = onChange ? value : current;
    return nextValue.filter((v) => allValuesSet.has(v));
  }, [onChange, value, options, current]);
  const usedMaxSelections =
    maxSelections === undefined
      ? options.length
      : Math.min(maxSelections, options.length);
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const singleValue = options[parseInt(event.target.value)];
      if (singleValue !== undefined) {
        const nextValue = usedValue.includes(singleValue.value)
          ? usedValue.filter((v) => v !== singleValue.value)
          : [...usedValue, singleValue.value];
        const limitedNextValue = nextValue.slice(
          0,
          Math.max(0, usedMaxSelections),
        );
        if (onChange) {
          onChange(limitedNextValue);
        } else {
          setCurrent(limitedNextValue);
        }
      }
    },
    [usedMaxSelections, usedValue, setCurrent, onChange, options],
  );
  const columnClass = ["col-md-12", "col-md-6", "col-md-4"][
    baseColumns ? baseColumns - 1 : 0
  ];

  const handleFilter = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const v = event.target.value;
      setFilterValue(v);
    },
    [setFilterValue],
  );

  const handleFilterChecked = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const v = event.target.checked;
      setFilterChecked(v);
    },
    [setFilterChecked],
  );

  const [filteredValuesSet, usedValueSet] = useMemo(() => {
    const textFiltered = filterValue
      ? options.filter((v) =>
          v.label.toLowerCase().includes(filterValue.toLowerCase()),
        )
      : options;
    const checkedFiltered = filterChecked
      ? textFiltered.filter((v) => usedValue.includes(v.value))
      : textFiltered;
    return [new Set(checkedFiltered.map((v) => v.value)), new Set(usedValue)];
  }, [options, usedValue, filterValue, filterChecked]);

  const handleToggleAll = useCallback<
    MouseEventHandler<HTMLButtonElement>
  >(() => {
    const updatedValueSet = filteredValuesSet.difference(usedValueSet);
    const allFilteredSelected = updatedValueSet.size === 0;
    const limitedValueSet = new Set(
      Array.from(updatedValueSet).slice(
        0,
        Math.max(0, usedMaxSelections - usedValueSet.size),
      ),
    );
    const nextValue =
      allFilteredSelected || usedValueSet.size === usedMaxSelections
        ? Array.from(usedValueSet.difference(filteredValuesSet))
        : Array.from(usedValueSet.union(limitedValueSet));
    if (onChange) {
      onChange(nextValue);
    } else {
      setCurrent(nextValue);
    }
  }, [
    usedMaxSelections,
    filteredValuesSet,
    usedValueSet,
    setCurrent,
    onChange,
  ]);
  const hiddenSelections = usedValueSet.difference(filteredValuesSet);
  const availableItems = Math.min(
    usedMaxSelections - hiddenSelections.size,
    usedMaxSelections,
    filteredValuesSet.size,
  );

  return (
    <>
      {options.length ? (
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            id={fieldId}
            onChange={handleFilter}
            placeholder={filterText}
            aria-label={filterText}
          />
          <div className="input-group-text">
            <div className="form-check col-md-4">
              <input
                className="form-check-input"
                type="checkbox"
                onChange={handleFilterChecked}
                checked={filterChecked}
                value="filter-checked"
                id={filterCheckedId}
              />
              {minified ? (
                <label
                  className="form-check-label"
                  htmlFor={filterCheckedId}
                ></label>
              ) : (
                <></>
              )}
            </div>
          </div>
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={handleToggleAll}
            disabled={
              availableItems === 0 || availableItems !== filteredValuesSet.size
            }
          >
            {minified ? <Icon icon="toggles" /> : "Toggle all"}
          </button>
        </div>
      ) : (
        <></>
      )}
      {filteredValuesSet.size === options.length ? (
        <></>
      ) : (
        <div className={`mb-3 px-3 alert alert-info overflow-auto`}>
          Showing {filteredValuesSet.size} of {options.length} options.
          {hiddenSelections.size > 0 ? (
            <> Where {hiddenSelections.size} selected options are hidden.</>
          ) : (
            <></>
          )}
        </div>
      )}
      <div className={`mb-3 px-3 overflow-auto`} style={{ maxHeight: "15vh" }}>
        {options.map((option, index) => {
          const valueId = `${fieldId}-${option.value}`;
          const isChecked = usedValue.includes(option.value);
          return (
            <div
              key={option.value + ""}
              className={`form-check ${columnClass} ${filteredValuesSet.has(option.value) ? "" : "d-none"}`}
            >
              <input
                className="form-check-input"
                type="checkbox"
                name={name}
                onChange={handleChange}
                checked={isChecked}
                value={index}
                disabled={
                  usedValue.length === maxSelections && !isChecked
                    ? true
                    : undefined
                }
                id={valueId}
              />
              <label className="form-check-label" htmlFor={valueId}>
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </>
  );
}
