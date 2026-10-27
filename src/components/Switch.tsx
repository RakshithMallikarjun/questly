/** A labelled on/off switch row. */
export function SwitchRow({ label, hint, on, onChange, children }: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="set-row">
      <div className="grow">
        <span>{label}</span>
        {hint && <span className="muted tiny">{hint}</span>}
      </div>
      {children}
      <label className="switch">
        <input type="checkbox" role="switch" checked={on} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </label>
    </div>
  );
}
