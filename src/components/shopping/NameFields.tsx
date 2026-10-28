import { TextInput } from "../ui";
import { useT } from "../../i18n/useT";

/**
 * The name of a product, aisle or usual item, with its optional German name.
 * A German profile sees the German field first.
 */
export function NameFields({
  name,
  nameDe,
  onName,
  onNameDe,
  placeholder,
  autoFocus,
  onBlur,
}: {
  name: string;
  nameDe: string;
  onName: (name: string) => void;
  onNameDe: (nameDe: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Editors that save as you go (aisles) save when a field is left. */
  onBlur?: () => void;
}) {
  const { t, lang } = useT();
  const german = (
    <Field
      key="de"
      label={t("common.nameDe")}
      hint={t("common.nameDeHint")}
      value={nameDe}
      onChange={onNameDe}
      placeholder={lang === "de" ? placeholder : undefined}
      autoFocus={autoFocus && lang === "de"}
      onBlur={onBlur}
    />
  );
  const french = (
    <Field
      key="fr"
      label={t("common.nameFr")}
      hint={lang === "de" ? t("common.nameFrHint") : undefined}
      value={name}
      onChange={onName}
      placeholder={lang === "fr" ? placeholder : undefined}
      autoFocus={autoFocus && lang === "fr"}
      onBlur={onBlur}
    />
  );
  return <>{lang === "de" ? [german, french] : [french, german]}</>;
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  autoFocus,
  onBlur,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}) {
  return (
    <div>
      <TextInput
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onBlur={onBlur}
      />
      {hint && <p className="mt-1 text-[14px] text-muted">{hint}</p>}
    </div>
  );
}
