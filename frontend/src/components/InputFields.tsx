import {
  ChangeEvent,
  createContext,
  DetailedHTMLProps,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactElement,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useContext,
  useId,
} from "react";
import Icon from "./Icon";

type FieldContext = {
  fieldId?: string;
  helpId?: string;
  errorId?: string;
  required?: boolean;
};
export type FieldErrorGroup = Record<string, string | string[] | undefined>;
export const FieldContext = createContext<FieldContext>({});
export const FieldErrorContext = createContext<FieldErrorGroup>({});

function describedBy(...ids: (string | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

type FieldProps = PropsWithChildren<{
  label: string | ReactElement;
  helpText?: string | ReactElement;
  id?: string;
  icon?: string;
  required?: boolean;
}>;

function useFieldError(fieldId: string) {
  const fieldErrors = useContext(FieldErrorContext);
  const errors = fieldErrors[fieldId];
  return (errors ? (Array.isArray(errors) ? errors : [errors]) : []).join(", ");
}

export function FieldErrors({
  errors,
  children,
}: React.PropsWithChildren<{ errors: FieldErrorGroup }>) {
  const previousErrors = useContext(FieldErrorContext);
  const allErrors = Object.entries(errors).reduce<FieldErrorGroup>(
    (acc, [key, value]) => {
      acc[key] = [...(acc[key] ?? []), ...(value ?? [])];
      return acc;
    },
    { ...previousErrors },
  );
  return (
    <FieldErrorContext.Provider value={allErrors}>
      {children}
    </FieldErrorContext.Provider>
  );
}

export function VerticalField({
  children,
  label,
  helpText,
  id,
  icon,
  required,
}: FieldProps) {
  const helpId = useId();
  const allocatedId = useId();
  const allocatedErrorId = useId();
  const fieldId = id === undefined ? allocatedId : id;
  const error = useFieldError(fieldId);
  const errorId = error ? allocatedErrorId : undefined;
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={fieldId}>
        {icon ? <Icon icon={`${icon} me-2`} /> : <></>}
        {label}
        {required ? (
          <span className="ms-1" aria-hidden="true">
            *
          </span>
        ) : (
          <></>
        )}
      </label>
      <FieldContext.Provider value={{ fieldId, helpId, errorId, required }}>
        {children}
      </FieldContext.Provider>
      {helpText ? (
        <div id={helpId} className="form-text">
          {helpText}
        </div>
      ) : (
        <></>
      )}
      {error ? (
        <div id={errorId} className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

export function HorizontalField({
  children,
  label,
  helpText,
  id,
  icon,
  required,
}: FieldProps) {
  const helpId = useId();
  const allocatedId = useId();
  const allocatedErrorId = useId();
  const fieldId = id === undefined ? allocatedId : id;
  const error = useFieldError(fieldId);
  const errorId = error ? allocatedErrorId : undefined;
  return (
    <div className="row g-3 align-items-center">
      <div className="col-auto">
        <label className="form-label" htmlFor={fieldId}>
          {icon ? <Icon icon={`${icon} me-2`} /> : <></>}
          {label}
          {required ? (
            <span className="ms-1" aria-hidden="true">
              *
            </span>
          ) : (
            <></>
          )}
        </label>
      </div>
      <div className="col-auto">
        <FieldContext.Provider value={{ fieldId, helpId, errorId, required }}>
          {children}
        </FieldContext.Provider>
      </div>
      {helpText ? (
        <div className="col-auto">
          <div id={helpId} className="form-text">
            {helpText}
          </div>
        </div>
      ) : (
        <></>
      )}
      {error ? (
        <div className="col-auto">
          <div id={errorId} className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

export function FormSection({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mt-4">
      <legend>
        <i className={`bi bi-${icon} me-4`} aria-hidden="true" />
        {title}
      </legend>
      <div>{children}</div>
    </fieldset>
  );
}

function getFirstValue<T>(...values: (T | undefined)[]): T | undefined {
  for (const v of values) {
    if (v !== undefined) return v;
  }
  return undefined;
}

export function SelectInput<T>({
  options,
  value,
  defaultValue,
  onChange,
  ...props
}: Omit<
  DetailedHTMLProps<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>,
  "onChange" | "value" | "defaultValue"
> & {
  options: { value: T; label: string; disabled?: true }[];
  onChange?: (
    v: T,
    event: ChangeEvent<HTMLSelectElement, HTMLSelectElement>,
  ) => void;
  value?: T;
  defaultValue?: T;
}) {
  const {
    fieldId,
    helpId,
    errorId,
    required: fieldRequired,
  } = useContext(FieldContext);
  const required = getFirstValue(props.required, fieldRequired);

  const toHtmlOptionValue = (optionValue: T, index: number) => {
    return optionValue === "" ? "" : String(index);
  };

  const selectedIndex =
    value === undefined
      ? undefined
      : options.findIndex((o) => o.value === value);
  const selectedDefaultIndex =
    defaultValue === undefined
      ? undefined
      : options.findIndex((o) => o.value === defaultValue);

  const selectedHtmlValue =
    selectedIndex === undefined || selectedIndex < 0
      ? undefined
      : toHtmlOptionValue(options[selectedIndex].value, selectedIndex);

  const selectedDefaultHtmlValue =
    selectedDefaultIndex === undefined || selectedDefaultIndex < 0
      ? undefined
      : toHtmlOptionValue(
          options[selectedDefaultIndex].value,
          selectedDefaultIndex,
        );

  return (
    <select
      {...props}
      onChange={(event) => {
        if (onChange) {
          const htmlValue = event.target.value;

          const selectedIndex =
            htmlValue === ""
              ? options.findIndex((o) => o.value === "")
              : parseInt(htmlValue, 10);

          const selectedOption = options[selectedIndex];

          if (selectedOption !== undefined) {
            onChange(selectedOption.value, event);
          }
        }
      }}
      value={selectedHtmlValue}
      defaultValue={selectedDefaultHtmlValue}
      required={required}
      aria-required={required}
      aria-invalid={errorId ? true : undefined}
      className="form-select"
      id={fieldId}
      aria-describedby={describedBy(helpId, errorId)}
    >
      {options.map(({ value, label, disabled }, index) => (
        <option
          key={index}
          value={toHtmlOptionValue(value, index)}
          disabled={disabled}
        >
          {label}
        </option>
      ))}
    </select>
  );
}

export function TextInput(
  props: DetailedHTMLProps<
    InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >,
) {
  const {
    fieldId,
    helpId,
    errorId,
    required: fieldRequired,
  } = useContext(FieldContext);
  const required = getFirstValue(props.required, fieldRequired);
  return (
    <input
      {...props}
      required={required}
      aria-required={required}
      aria-invalid={errorId ? true : undefined}
      className={`form-control ${props.className || ""}`}
      id={fieldId}
      aria-describedby={describedBy(helpId, errorId)}
    />
  );
}

export function TextArea(
  props: DetailedHTMLProps<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  >,
) {
  const {
    fieldId,
    helpId,
    errorId,
    required: fieldRequired,
  } = useContext(FieldContext);
  const required = getFirstValue(props.required, fieldRequired);
  return (
    <textarea
      {...props}
      required={required}
      aria-required={required}
      aria-invalid={errorId ? true : undefined}
      className={`form-control ${props.className || ""}`}
      id={fieldId}
      aria-describedby={describedBy(helpId, errorId)}
    />
  );
}
