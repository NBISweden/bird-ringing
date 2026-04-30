import { useState, useCallback, useId, ChangeEventHandler, MouseEventHandler, useMemo } from "react";
import Icon from "./Icon";

export type FieldValue<T=unknown> = {
  value: T;
  label: string;
  _meta?: Record<string, unknown>;
}

export type Field<T=unknown> = {
  label: string;
  name: string;
  value?: T;
  values: FieldValue<T>[];
  placeholder?: string;
}

export type MultiValueField<T=unknown> = Omit<Field<T>, "value"> & {
  value: T[];
}

export const MultiSelectField = ({field, onChange, filterText, maxSelections, baseColumns, minified}: {field: MultiValueField<unknown>, onChange?: (value: unknown[]) => void, maxSelections?: number, filterText?: string, baseColumns?: 1 | 2 | 3, minified?: boolean}) => {
  const fieldId = useId();
  const filterCheckedId = useId();
  const [filterValue, setFilterValue] = useState<string | undefined>();
  const [filterChecked, setFilterChecked] = useState<boolean>(false);
  const [current, setCurrent] = useState<unknown[]>(field.value);
  const usedValue = useMemo(() => {
    const allValuesSet = new Set(field.values.map(v => v.value));
    const nextValue = onChange ? field.value : current;
    return nextValue.filter(v => allValuesSet.has(v));
  }, [onChange, field.value, field.values, current])
  const usedMaxSelections = maxSelections === undefined ? field.values.length : Math.min(maxSelections, field.values.length);
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const singleValue: unknown  = event.target.value;
    if (singleValue !== undefined) {
      const nextValue = (
        usedValue.includes(singleValue)
        ? usedValue.filter(v => v !== singleValue)
        : [...usedValue, singleValue]
      );
      const limitedNextValue = nextValue.slice(0, Math.max(0, usedMaxSelections))
      if (onChange) {
        onChange(limitedNextValue);
      } else {
        setCurrent(limitedNextValue);
      }
    }
  }, [usedMaxSelections, usedValue, setCurrent, onChange]);
  const columnClass = ["col-md-12", "col-md-6", "col-md-4"][baseColumns ? baseColumns - 1 : 0]

  const handleFilter = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const v = event.target.value;
    setFilterValue(v);
  }, [setFilterValue]);

  const handleFilterChecked = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const v = event.target.checked;
    setFilterChecked(v);
  }, [setFilterChecked]);

  const [filteredValuesSet, usedValueSet] = useMemo(() => {
    const textFiltered = filterValue ? field.values.filter(v => v.label.toLowerCase().includes(filterValue.toLowerCase())) : field.values;
    const checkedFiltered = filterChecked ? textFiltered.filter(v => usedValue.includes(v.value)) : textFiltered;
    return [new Set(checkedFiltered.map(v => v.value)), new Set(usedValue)];
  }, [field.values, usedValue, filterValue, filterChecked]);

  const handleToggleAll = useCallback<MouseEventHandler<HTMLButtonElement>>(() => {
    const updatedValueSet = filteredValuesSet.difference(usedValueSet);
    const allFilteredSelected = updatedValueSet.size === 0;
    const limitedValueSet = new Set(Array.from(updatedValueSet).slice(0, Math.max(0, usedMaxSelections - usedValueSet.size)))
    const nextValue = allFilteredSelected || usedValueSet.size === usedMaxSelections
      ? Array.from(usedValueSet.difference(filteredValuesSet))
      : Array.from(usedValueSet.union(limitedValueSet));
    if (onChange) {
        onChange(nextValue);
      } else {
        setCurrent(nextValue);
      }
  }, [usedMaxSelections, filteredValuesSet, usedValueSet, setCurrent, onChange]);
  const hiddenSelections = usedValueSet.difference(filteredValuesSet)
  const availableItems = Math.min(usedMaxSelections - hiddenSelections.size, usedMaxSelections, filteredValuesSet.size);

  return (
    <>
      <label htmlFor={fieldId}>{ field.label }</label>
      {field.values.length ? (
        <div className="input-group mb-3">
          <input type="text" className="form-control" id={fieldId} onChange={handleFilter} placeholder={filterText} aria-label={filterText}/>
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
              {minified ? <label className="form-check-label" htmlFor={filterCheckedId}></label> : <></>}
            </div>
          </div>
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={handleToggleAll}
            disabled={availableItems === 0 || availableItems !== filteredValuesSet.size}
            >{minified ? <Icon icon="toggles" /> : "Toggle all"}</button>
        </div>
      ) : <></>}
      {filteredValuesSet.size === field.values.length ? <></> : <div className={`row mb-3 px-3 alert alert-info overflow-auto max-vh-20`}>
        Showing {filteredValuesSet.size} of {field.values.length} options.
        {hiddenSelections.size > 0 ? <> Where {hiddenSelections.size} selected options are hidden.</> : <></>}
      </div>}
      <div className={`row mb-3 px-3 overflow-auto max-vh-20`}>
      {field.values.map(value => {
        const valueId = `${fieldId}-${value.value}`;
        const isChecked = usedValue.includes(value.value);
        return (
          <div key={value.value + ""} className={`form-check ${columnClass} ${filteredValuesSet.has(value.value) ? "" : "d-none"}`}>
            <input
              className="form-check-input"
              type="checkbox"
              name={field.name}
              onChange={handleChange}
              checked={isChecked} 
              value={value.value + ""}
              disabled={usedValue.length === maxSelections && !isChecked ? true : undefined}
              id={valueId}
              />
            <label
              className="form-check-label"
              htmlFor={valueId}
            >{ value.label }</label>
          </div>
        )
      })}
      </div>
      <div className={`row mb-3 px-3`}></div>
    </>
  )
}
