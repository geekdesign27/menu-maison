import { Check, GraduationCap, Sparkles } from "lucide-react";
import { LogoSymbol } from "../../components/Logo";
import { cx } from "../../components/ui";
import { PRICE_CHF, TRIAL_DAYS } from "../../../convex/domain/billing";
import { Toque } from "../doodles";
import { SIGNUP_HASH } from "../entry";
import { Heading, pill, Reveal, Section, useLanding, useLogin } from "../parts";
import { useL } from "../lang";

const POINTS = [
  "pricing.point1",
  "pricing.point2",
  "pricing.point3",
  "pricing.point4",
  "pricing.point5",
] as const;

/** « En parler avec P-A », only when a real contact is configured (VITE_CONTACT_URL). */
function ContactButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { contact } = useLanding();
  if (!contact) return null;
  const external = contact.startsWith("https:");
  return (
    <a
      href={contact}
      className={cx(pill.secondary, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}

/** The yearly price and the trial; the trial button waits for VITE_SIGNUP_OPEN (S7). */
export function Pricing() {
  const { signedIn, signupOpen, contact } = useLanding();
  const { l } = useL();
  const login = useLogin();

  return (
    <Section id="tarif" tone="paper">
      <Reveal>
        <div className="relative rounded-[2.4rem] border-2 border-dashed border-carrot/30 bg-cream p-6 sm:p-12 lg:p-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
            <div>
              <Heading id="tarif">{l("pricing.title")}</Heading>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/80">
                {l("pricing.lead")}
              </p>
              <ul className="mt-8 grid gap-3">
                {POINTS.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-3 text-[17px] leading-snug"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-herb/15 text-herb">
                      <Check size={18} strokeWidth={3} aria-hidden />
                    </span>
                    {l(key)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative self-start rounded-[2rem] bg-paper p-6 text-center shadow-[0_20px_40px_-28px_rgba(158,63,18,0.7)] ring-1 ring-line sm:p-8">
              <span
                aria-hidden
                className="mx-auto flex size-16 items-center justify-center rounded-[1.1rem] bg-brand text-white"
              >
                <LogoSymbol size={50} />
              </span>
              <p className="mt-5 flex items-baseline justify-center gap-2">
                <span className="text-[22px] font-black text-muted">
                  {l("pricing.currency")}
                </span>
                <span className="text-[64px] leading-none font-black tracking-tight">
                  {PRICE_CHF}
                </span>
              </p>
              <p className="mt-2 text-[17px] font-extrabold">
                {l("pricing.period")}
              </p>
              <p className="mt-1 text-[15px] text-muted">
                {l("pricing.perMonth")}
              </p>

              {signupOpen ? (
                <>
                  <a
                    href={SIGNUP_HASH}
                    className={cx(pill.primary, pill.large, "mt-7 w-full")}
                  >
                    {l("pricing.trial", { days: TRIAL_DAYS })}
                  </a>
                  <p className="mt-3 text-[15px] leading-snug text-muted">
                    {l("pricing.trialNote", { days: TRIAL_DAYS })}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-sun/25 px-5 text-[16px] font-extrabold text-ink">
                    <Sparkles size={18} aria-hidden /> {l("pricing.soon")}
                  </p>
                  <p className="mt-3 text-[15px] leading-snug text-muted">
                    {l("pricing.soonNote")} {contact && l("pricing.question")}
                  </p>
                  <ContactButton
                    label={l("pricing.write")}
                    className="mt-4 w-full"
                  />
                </>
              )}

              {!signedIn && (
                <p className="mt-6 border-t border-line pt-5 text-[15px] text-muted">
                  {l("pricing.member")}{" "}
                  <a
                    href={login.href}
                    className="inline-flex min-h-11 items-center font-extrabold text-carrot-dark underline underline-offset-4"
                  >
                    {login.label}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

const COURSES = [
  { titleKey: "training.item1Title", textKey: "training.item1" },
  { titleKey: "training.item2Title", textKey: "training.item2" },
] as const;

/** P-A's training and coaching on AI, on request, apart from the subscription. */
export function Training() {
  const { contact } = useLanding();
  const { l } = useL();

  return (
    <Section id="formation">
      <Reveal className="grid grid-cols-1 gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16">
        <div
          aria-hidden
          className="relative mx-auto hidden w-fit pt-14 lg:block"
        >
          <Toque className="absolute top-0 left-1/2 w-24 -translate-x-1/2 rotate-[8deg] text-ink" />
          <span className="flex size-36 items-center justify-center rounded-[2rem] bg-carrot-soft text-carrot-dark">
            <GraduationCap size={72} strokeWidth={1.6} />
          </span>
        </div>

        <div className="max-w-2xl">
          <Heading id="formation">{l("training.title")}</Heading>
          <p className="mt-6 text-lg leading-relaxed text-ink/80">
            {l("training.lead")}
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {COURSES.map(({ titleKey, textKey }) => (
              <li
                key={titleKey}
                className="rounded-[1.6rem] bg-paper p-5 ring-1 ring-line"
              >
                <h3 className="text-[19px] font-black tracking-tight">
                  {l(titleKey)}
                </h3>
                <p className="mt-2 text-[16px] leading-relaxed text-muted">
                  {l(textKey)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[17px] leading-relaxed text-ink/80">
            {l("training.note")}
          </p>
          <div className="mt-7">
            {contact ? (
              <ContactButton
                label={l("training.contact")}
                className={pill.large}
              />
            ) : (
              <p className="text-[17px] font-bold text-ink">
                {l("training.askFriend")}
              </p>
            )}
          </div>
          <p className="mt-6 text-[15px] leading-snug text-muted italic">
            {l("training.promise")}
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
