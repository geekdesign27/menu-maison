import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { LogoSymbol } from "../../components/Logo";
import { cx } from "../../components/ui";
import { Stamp, Toque } from "../doodles";
import { LOGIN_HASH } from "../entry";
import { Heading, pill, Reveal, Section, useLanding, useLogin } from "../parts";
import { useL } from "../lang";

/** « En parler avec P-A », only when a real contact is configured (VITE_CONTACT_URL). */
function ContactButton({ className }: { className?: string }) {
  const { contact } = useLanding();
  const { l } = useL();
  if (!contact) return null;
  const external = contact.startsWith("https:");
  return (
    <a
      href={contact}
      className={cx(pill.secondary, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {l("access.contact")}
    </a>
  );
}

export function PrivateAccess() {
  const { signedIn, contact, openNoInvite } = useLanding();
  const { l } = useL();
  const login = useLogin(l("access.login"));

  return (
    <Section id="acces" tone="paper">
      <Reveal>
        <div className="relative rounded-[2.4rem] border-2 border-dashed border-carrot/30 bg-cream p-6 sm:p-12 lg:p-16">
          <Stamp className="absolute -top-10 right-4 size-28 rotate-[-10deg] text-carrot-dark/85 sm:-top-12 sm:right-10 sm:size-36" />

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16">
            <div aria-hidden className="relative mx-auto hidden w-fit lg:block">
              <Toque className="absolute -top-14 left-1/2 w-24 -translate-x-1/2 rotate-[8deg] text-ink" />
              <span className="flex size-36 items-center justify-center rounded-[2rem] bg-brand text-white shadow-[0_20px_40px_-20px_rgba(158,63,18,0.8)]">
                <LogoSymbol size={112} />
              </span>
            </div>

            <div className="max-w-2xl">
              <Heading id="acces" className="pr-24 sm:pr-36 lg:pr-28">
                {l("access.title")}
              </Heading>
              <p className="mt-6 text-lg leading-relaxed text-ink/80">
                {l("access.p1")}
              </p>
              <p className="mt-4 text-lg leading-relaxed text-ink/80">
                {l("access.p2")}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href={login.href} className={cx(pill.primary, pill.large)}>
                  {login.label}
                </a>
                {!signedIn && (
                  <button
                    type="button"
                    onClick={openNoInvite}
                    className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-[17px] font-extrabold text-carrot-dark underline decoration-2 underline-offset-4 hover:bg-carrot-soft"
                  >
                    {l("access.noAccount")}
                  </button>
                )}
              </div>

              <div className="my-12 flex items-center gap-4" role="separator" aria-hidden>
                <span className="h-0.5 flex-1 rounded-full bg-carrot/20" />
                <span className="text-center text-[17px] font-extrabold text-muted">{l("access.separator")}</span>
                <span className="h-0.5 flex-1 rounded-full bg-carrot/20" />
              </div>

              <h3 className="text-[clamp(1.5rem,3vw,2rem)] leading-tight font-black tracking-tight">
                {l("access.subtitle")}
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-ink/80">
                {l("access.p3")}
              </p>
              <p className="mt-4 text-lg leading-relaxed text-ink/80">
                {l("access.p4")}
              </p>
              <div className="mt-7">
                {contact ? (
                  <ContactButton className={pill.large} />
                ) : (
                  <p className="text-[17px] font-bold text-ink">
                    {l("access.askFriend")}
                  </p>
                )}
              </div>
              <p className="mt-6 text-[15px] leading-snug text-muted italic">
                {l("access.promise")}
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/** The friendly « not on the guest list yet » message: no sign-up, no waiting list. */
export function NoInviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { l } = useL();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="lp-noinvite-title"
      className="m-auto w-[min(92vw,34rem)] rounded-[2rem] bg-cream p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 sm:p-9">
        <button
          type="button"
          onClick={onClose}
          aria-label={l("access.dialog.close")}
          className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full hover:bg-carrot-soft"
        >
          <X size={22} aria-hidden />
        </button>
        <p className="text-4xl" aria-hidden>
          📖
        </p>
        <h2 id="lp-noinvite-title" className="mt-3 pr-10 text-[26px] leading-tight font-black tracking-tight">
          {l("access.dialog.title")}
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink/80">
          {l("access.dialog.p1")}
        </p>
        <p className="mt-3 text-[17px] leading-relaxed text-ink/80">
          {l("access.dialog.p2")}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a href={LOGIN_HASH} className={pill.primary} onClick={onClose}>
            {l("access.dialog.back")}
          </a>
          <ContactButton />
        </div>
      </div>
    </dialog>
  );
}
