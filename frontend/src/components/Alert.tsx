import { ButtonType } from "@/app/system/common";

export function Alert({
  children,
  type,
}: {
  children: React.ReactNode;
  type?: ButtonType;
}) {
  type = type ? type : "info";
  return (
    <div className={`alert alert-${type}`} role="alert">
      {children}
    </div>
  );
}
