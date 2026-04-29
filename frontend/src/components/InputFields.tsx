import {
  createContext,
  DetailedHTMLProps,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactElement,
  SelectHTMLAttributes,
  useContext,
  useId,
} from "react";
import Icon from "./Icon";

type FieldContext = {
  fieldId?: string;
  helpId?: string;
};
export const FieldContext = createContext<FieldContext>({});
export const FieldErrorContext = createContext<
  Record<string, string | undefined>
>({});

type FieldProps = PropsWithChildren<{
  label: string | ReactElement;
  helpText?: string | ReactElement;
  id?: string;
}>;

export function VerticalField({ children, label, helpText, id }: FieldProps) {
  const helpId = useId();
  const allocatedId = useId();
  const fieldId = id === undefined ? allocatedId : id;
  const fieldErrors = useContext(FieldErrorContext);
  const error = fieldErrors[fieldId];
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={fieldId}>
        {label}
      </label>
      <FieldContext.Provider value={{ fieldId, helpId }}>
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

export function HorizontalField({ children, label, helpText, id }: FieldProps) {
  const helpId = useId();
  const allocatedId = useId();
  const fieldId = id === undefined ? allocatedId : id;
  const fieldErrors = useContext(FieldErrorContext);
  const error = fieldErrors[fieldId];
  return (
    <div className="row g-3 align-items-center">
      <div className="col-auto">
        <label className="form-label" htmlFor={fieldId}>
          {label}
        </label>
      </div>
      <div className="col-auto">
        <FieldContext.Provider value={{ fieldId, helpId }}>
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

export function RequiredField({
  required,
  children,
}: PropsWithChildren<{ required: boolean }>) {
  return required ? (
    <div className="input-group">
      {children}
      <span className="input-group-text" id="basic-addon1">
        <Icon icon="exclamation-diamond" />
      </span>
    </div>
  ) : (
    children
  );
}

export function SelectInput<T>({
  options,
  ...props
}: DetailedHTMLProps<
  SelectHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
> & { options: { value: T; label: string }[] }) {
  const { fieldId, helpId } = useContext(FieldContext);
  return (
    <RequiredField
      required={props.required === undefined ? false : props.required}
    >
      <select
        {...props}
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
    </RequiredField>
  );
}

export function TextInput(
  props: DetailedHTMLProps<
    InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >,
) {
  const { fieldId, helpId } = useContext(FieldContext);
  return (
    <RequiredField
      required={props.required === undefined ? false : props.required}
    >
      <input
        {...props}
        className="form-control"
        id={fieldId}
        aria-describedby={helpId ? helpId : undefined}
      />
    </RequiredField>
  );
}
