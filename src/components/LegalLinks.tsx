import { LEGAL_HASHES } from "../landing/entry";
import { useT } from "../i18n/useT";

// A new tab: the sign-up form keeps what was typed, the app stays where it was
const newTab = { target: "_blank", rel: "noopener" } as const;
const link = "font-bold text-carrot-dark underline underline-offset-2";

/** Sign-up form: « En continuant, tu acceptes les conditions générales et la politique de confidentialité. » */
export function LegalConsent() {
  const { t } = useT();
  return (
    <p className="text-center text-[14px] leading-snug text-muted">
      {t("common.legal.accept")}{" "}
      <a href={LEGAL_HASHES.conditions} {...newTab} className={link}>
        {t("common.legal.terms")}
      </a>{" "}
      {t("common.legal.and")}{" "}
      <a href={LEGAL_HASHES.confidentialite} {...newTab} className={link}>
        {t("common.legal.privacy")}
      </a>
      .
    </p>
  );
}

/** Subscription panel: the three legal pages, in a row. */
export function LegalLinksRow() {
  const { t } = useT();
  const items = [
    { href: LEGAL_HASHES.conditions, label: t("common.legal.termsLink") },
    {
      href: LEGAL_HASHES.confidentialite,
      label: t("common.legal.privacyLink"),
    },
    { href: LEGAL_HASHES.mentions, label: t("common.legal.mentionsLink") },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 text-[16px]">
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            {...newTab}
            className={`inline-flex min-h-11 items-center ${link}`}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
