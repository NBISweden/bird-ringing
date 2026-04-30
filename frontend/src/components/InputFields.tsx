import {
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
  required?: boolean;
};
export const FieldContext = createContext<FieldContext>({});
export const FieldErrorContext = createContext<
  Record<string, string | undefined>
>({});

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
  const fieldId = id === undefined ? allocatedId : id;
  const fieldErrors = useContext(FieldErrorContext);
  const error = fieldErrors[fieldId];
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={fieldId}>
        {icon ? <Icon icon={`${icon} me-2`} /> : <></>}
        {label}
        {required ? <span className="ms-1">*</span> : <></>}
      </label>
      <FieldContext.Provider value={{ fieldId, helpId, required }}>
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
        <div className="alert alert-danger mt-3" role="alert">
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
  const fieldId = id === undefined ? allocatedId : id;
  const fieldErrors = useContext(FieldErrorContext);
  const error = fieldErrors[fieldId];
  return (
    <div className="row g-3 align-items-center">
      <div className="col-auto">
        <label className="form-label" htmlFor={fieldId}>
          {icon ? <Icon icon={`${icon} me-2`} /> : <></>}
          {label}
          {required ? <span className="ms-1">*</span> : <></>}
        </label>
      </div>
      <div className="col-auto">
        <FieldContext.Provider value={{ fieldId, helpId, required }}>
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
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
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
  ...props
}: DetailedHTMLProps<
  SelectHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
> & { options: { value: T; label: string }[] }) {
  const { fieldId, helpId, required: fieldRequired } = useContext(FieldContext);
  const required = getFirstValue(props.required, fieldRequired);
  return (
    <select
      {...props}
      required={required}
      className="form-select"
      id={fieldId}
      aria-describedby={helpId ? helpId : undefined}
    >
      {options.map(({ value, label }) => (
        <option key={String(value)} value={String(value)}>
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
  const { fieldId, helpId, required: fieldRequired } = useContext(FieldContext);
  const required = getFirstValue(props.required, fieldRequired);
  return (
    <input
      {...props}
      required={required}
      className="form-control"
      id={fieldId}
      aria-describedby={helpId ? helpId : undefined}
    />
  );
}

export function TextArea(
  props: DetailedHTMLProps<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  >,
) {
  const { fieldId, helpId, required: fieldRequired } = useContext(FieldContext);
  const required = getFirstValue(props.required, fieldRequired);
  return (
    <textarea
      {...props}
      required={required}
      className="form-control"
      id={fieldId}
      aria-describedby={helpId ? helpId : undefined}
    />
  );
}
