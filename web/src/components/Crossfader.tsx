interface Props {
  value: number; // 0–1
  meterA: number;
  meterB: number;
  onChange: (v: number) => void;
}

export function Crossfader({ value, meterA, meterB, onChange }: Props) {
  return (
    <aside className="mixer" aria-label="Mixer">
      <div className="xfader-block">
        <label className="xfader-label" htmlFor="crossfader">
          Crossfader
        </label>
        <input
          type="range"
          id="crossfader"
          className="crossfader"
          min={0}
          max={100}
          value={Math.round(value * 100)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
        />
        <div className="xfader-ends">
          <span className="xf-a">A</span>
          <span className="xf-b">B</span>
        </div>
      </div>
      <div className="master-meter" aria-hidden="true">
        <div className="meter-bar" id="meter-a" style={{ height: `${meterA}%` }} />
        <div className="meter-bar" id="meter-b" style={{ height: `${meterB}%` }} />
      </div>
    </aside>
  );
}
