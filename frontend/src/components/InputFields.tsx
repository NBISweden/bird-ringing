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
export const FieldContext = createContext<FieldContext>({});
export const FieldErrorContext = createContext<
  Record<string, string | undefined>
>({});

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
  const fieldErrors = useContext(FieldErrorContext);
  const error = fieldErrors[fieldId];
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
  const fieldErrors = useContext(FieldErrorContext);
  const error = fieldErrors[fieldId];
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
  options: { value: T; label: string }[];
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
  const selectedValue =
    value === undefined
      ? undefined
      : options.findIndex((o) => o.value === value);
  const selectedDefaultValue =
    defaultValue === undefined
      ? undefined
      : options.findIndex((o) => o.value === defaultValue);
  return (
    <select
      {...props}
      onChange={(event) => {
        if (onChange) {
          onChange(options[parseInt(event.target.value)].value, event);
        }
      }}
      value={selectedValue}
      defaultValue={selectedDefaultValue}
      required={required}
      aria-required={required}
      aria-invalid={errorId ? true : undefined}
      className="form-select"
      id={fieldId}
      aria-describedby={describedBy(helpId, errorId)}
    >
      {options.map(({ label }, index) => (
        <option key={index} value={index}>
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
