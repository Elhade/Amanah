interface ProgressBarProps {
  value: number;        // carte (emerald-600)
  valueSepa?: number;   // prélèvement SEPA (emerald-300)
  valueCashRemitted?: number; // espèces versées (amber-400)
  valueCashReceived?: number;  // espèces reçues, en attente (amber-200)
  /** @deprecated use valueCashRemitted */
  valueCash?: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
}

export function ProgressBar({
  value, valueSepa = 0, valueCashRemitted, valueCashReceived = 0,
  valueCash, max, label, showPercentage = true, color = 'bg-emerald-600',
}: ProgressBarProps) {
  const cashRemitted = valueCashRemitted ?? valueCash ?? 0;
  const total = value + valueSepa + cashRemitted + valueCashReceived;
  const percentage = max > 0 ? Math.min(Math.round((total / max) * 100), 100) : 0;
  const pctCard     = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const pctSepa     = max > 0 ? Math.min((valueSepa / max) * 100, 100 - pctCard) : 0;
  const pctRemitted    = max > 0 ? Math.min((cashRemitted / max) * 100, 100 - pctCard - pctSepa) : 0;
  const pctReceived     = max > 0 ? Math.min((valueCashReceived / max) * 100, 100 - pctCard - pctSepa - pctRemitted) : 0;

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && <span className="text-sm font-bold text-emerald-600">{percentage}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
        <div className={`h-full ${color} transition-all duration-700 ease-out`}           style={{ width: `${pctCard}%` }} />
        <div className="h-full bg-emerald-300 transition-all duration-700 ease-out"        style={{ width: `${pctSepa}%` }} />
        <div className="h-full bg-amber-400 transition-all duration-700 ease-out"          style={{ width: `${pctRemitted}%` }} />
        <div className="h-full bg-amber-200 transition-all duration-700 ease-out"          style={{ width: `${pctReceived}%` }} />
      </div>
    </div>
  );
}
