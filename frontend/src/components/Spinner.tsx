export default function Spinner({ className }: { className?: string }) {
  return (
    <div className={`spinner-border ${className || ""}`} role="status">
      <span className="sr-only" />
    </div>
  );
}
