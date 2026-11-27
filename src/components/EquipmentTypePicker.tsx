import type { ExerciseEquipmentType } from '../types/equipment';
import type { EquipmentTypeOption } from '../utils/availableEquipmentTypes';

interface EquipmentTypePickerProps {
  options: EquipmentTypeOption[];
  value: ExerciseEquipmentType;
  onChange: (type: ExerciseEquipmentType) => void;
  /** Accessible name for the radiogroup. */
  label?: string;
}

/** Compact segmented chips for picking loadout equipment type. */
export function EquipmentTypePicker({
  options,
  value,
  onChange,
  label = 'Type de matériel',
}: EquipmentTypePickerProps) {
  if (options.length === 0) return null;

  return (
    <div
      className="equip-picker"
      role="radiogroup"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value || 'empty'}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`equip-chip${selected ? ' equip-chip--active' : ''}${
              opt.calculates ? '' : ' equip-chip--mute'
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
