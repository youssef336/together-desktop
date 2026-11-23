import { type Appearance, APPEARANCE_OPTIONS, COLOR_FIELDS, type ColorKey, type OptionKey } from '../../domain/appearance';
import { Chips, Label, Swatches } from '../../ui/controls';

export const PART_TABS = ['Face', 'Hair', 'Body', 'Outfit', 'Accessories'] as const;
export type PartTab = (typeof PART_TABS)[number];

type Row = { label: string; option?: OptionKey; color?: ColorKey; eyeSize?: true };

const ROWS: Record<PartTab, Row[]> = {
  Face: [
    { label: 'Face shape', option: 'faceShape' },
    { label: 'Skin tone', color: 'skin' },
    { label: 'Eyes', option: 'eyeShape' },
    { label: 'Eye size', eyeSize: true },
    { label: 'Eye colour', color: 'eyeColor' },
    { label: 'Eyebrows', option: 'eyebrows' },
    { label: 'Nose', option: 'nose' },
    { label: 'Mouth', option: 'mouth' },
    { label: 'Details', option: 'detail' },
  ],
  Hair: [
    { label: 'Hair style', option: 'hairStyle' },
    { label: 'Hair length', option: 'hairLength' },
    { label: 'Hair colour', color: 'hairColor' },
  ],
  Body: [
    { label: 'Body shape', option: 'bodyShape' },
    { label: 'Height', option: 'height' },
  ],
  Outfit: [
    { label: 'Top', option: 'top' },
    { label: 'Top colour', color: 'topColor' },
    { label: 'Bottom', option: 'bottom' },
    { label: 'Bottom colour', color: 'bottomColor' },
    { label: 'Shoes', option: 'shoes' },
    { label: 'Shoe colour', color: 'shoeColor' },
  ],
  Accessories: [
    { label: 'Hat', option: 'hat' },
    { label: 'Hat / hair tie colour', color: 'hatColor' },
    { label: 'Glasses', option: 'glasses' },
    { label: 'Jewelry', option: 'jewelry' },
    { label: 'Jewelry colour', color: 'jewelryColor' },
  ],
};

interface Props {
  tab: PartTab;
  value: Appearance;
  onChange: (a: Appearance) => void;
  onRandomize: (field: OptionKey | ColorKey) => void;
}

export function LookPanel({ tab, value, onChange, onRandomize }: Props) {
  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="flex flex-col gap-5">
      {ROWS[tab].map((row) => {
        const field = row.option ?? row.color;
        return (
          <div key={row.label}>
            <div className="flex items-center justify-between">
              <Label>{row.label}</Label>
              {field && (
                <button
                  type="button"
                  onClick={() => onRandomize(field)}
                  className="mb-1 rounded-md px-1.5 text-sm text-ink-soft hover:bg-sunk hover:text-ink"
                  title={`Randomize ${row.label.toLowerCase()}`}
                  aria-label={`Randomize ${row.label.toLowerCase()}`}
                >
                  🎲
                </button>
              )}
            </div>
            {row.option && (
              <Chips
                options={APPEARANCE_OPTIONS[row.option] as readonly string[]}
                value={value[row.option] as string}
                onChange={(v) => set(row.option!, v as never)}
              />
            )}
            {row.color && <Swatches colors={COLOR_FIELDS[row.color]} value={value[row.color]} onChange={(c) => set(row.color!, c)} />}
            {row.eyeSize && (
              <Chips options={['small', 'big'] as const} value={value.eyeSize === 2 ? 'big' : 'small'} onChange={(v) => set('eyeSize', v === 'big' ? 2 : 1)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
