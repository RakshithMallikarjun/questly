import { strings } from '../i18n';
import { pickTip, type TipMoment } from '../game/tips';

/** One short habit tip with its credit. Plain text, never announced on its own. */
export function TipLine({ day, moment, id }: { day: string; moment: TipMoment; id?: string }) {
  const t = strings().tips;
  const tip = pickTip(moment === 'slip' ? t.slip : t.general, day, moment);
  if (!tip) return null;
  return (
    <div className="tip-line">
      <span className="tip-text" id={id}>{tip}</span>
      <span className="muted tiny">{t.credit}</span>
    </div>
  );
}
