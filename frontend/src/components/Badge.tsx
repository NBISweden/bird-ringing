import { BSColor } from "@/app/(system)/common";

type BadgeProps = {
  color?: BSColor;
  rounded?: boolean;
  outline?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Badge({ children, ...props }: BadgeProps) {
  const rounded = props.rounded === undefined ? false : props.rounded;
  const color: BSColor = props.color === undefined ? "primary" : props.color;
  const outline = props.outline === undefined ? false : props.outline;
  const className = props.className === undefined ? "" : props.className;
  const colorClass = outline
    ? `border border-${color} text-${color}`
    : `text-bg-${color}`;
  return (
    <span
      className={`badge ${rounded ? "rounded-pill" : ""} ${colorClass} ${className}`}
    >
      {children}
    </span>
  );
}
