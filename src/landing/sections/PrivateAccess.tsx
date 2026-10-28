import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { LogoSymbol } from "../../components/Logo";
import { cx } from "../../components/ui";
import { Stamp, Toque } from "../doodles";
import { LOGIN_HASH } from "../entry";
import { Heading, pill, Reveal, Section, useLanding, useLogin } from "../parts";
import { fr } from "../typo";

/** « En parler avec P-A », only when a real contact is configured (VITE_CONTACT_URL). */
function ContactButton({ className }: { className?: string }) {
  const { contact } = useLanding();
  if (!contact) return null;
  const external = contact.startsWith("https:");
  return (
    <a
      href={contact}
      className={cx(pill.secondary, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      En parler avec P-A
    </a>
  );
}

export function PrivateAccess() {
  const { signedIn, contact, openNoInvite } = useLanding();
  const login = useLogin("J'ai mon invitation, je me connecte");

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
                {fr`Tu veux entrer ? Il y a juste un petit détail…`}
              </Heading>
              <p className="mt-6 text-lg leading-relaxed text-ink/80">
                Menu Maison, c'est un projet maison, créé pour les amis des Schütz. Et comme pour les bons repas
                entre amis, on ne débarque pas sans invitation.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-ink/80">
                L'application n'est donc pas ouverte aux inscriptions publiques. Si tu fais partie des heureux
                invités, tu peux te connecter avec les accès qui t'ont été transmis.
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
                    Je n'ai pas de compte
                  </button>
                )}
              </div>

              <div className="my-12 flex items-center gap-4" role="separator" aria-hidden>
                <span className="h-0.5 flex-1 rounded-full bg-carrot/20" />
                <span className="text-center text-[17px] font-extrabold text-muted">{fr`Pas d'invitation ? Pas de panique.`}</span>
                <span className="h-0.5 flex-1 rounded-full bg-carrot/20" />
              </div>

              <h3 className="text-[clamp(1.5rem,3vw,2rem)] leading-tight font-black tracking-tight">
                {fr`Bonne nouvelle : la recette n'est pas secrète.`}
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-ink/80">
                {fr`Tu aimerais créer une application du même genre pour ta famille, ton association ou ton propre projet ? P-A peut volontiers te former et t'accompagner pour apprendre à construire ton outil.`}
              </p>
              <p className="mt-4 text-lg leading-relaxed text-ink/80">
                Il faudra quelques écus, beaucoup de motivation et une bonne dose de curiosité. Le tablier est
                facultatif.
              </p>
              <div className="mt-7">
                {contact ? (
                  <ContactButton className={pill.large} />
                ) : (
                  <p className="text-[17px] font-bold text-ink">
                    Pour en parler, passe par la personne qui t'a fait découvrir Menu Maison.
                  </p>
                )}
              </div>
              <p className="mt-6 text-[15px] leading-snug text-muted italic">
                Promis, pas besoin de savoir coder avant de commencer. Mais il faudra accepter d'apprendre deux ou
                trois trucs.
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
          aria-label="Fermer"
          className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full hover:bg-carrot-soft"
        >
          <X size={22} aria-hidden />
        </button>
        <p className="text-4xl" aria-hidden>
          📖
        </p>
        <h2 id="lp-noinvite-title" className="mt-3 pr-10 text-[26px] leading-tight font-black tracking-tight">
          {fr`Aïe, tu n'es pas encore dans le carnet d'invitations !`}
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink/80">
          {fr`Menu Maison est réservé aux amis des Schütz. Pas d'inscription libre pour le moment : ici, on entre sur invitation, comme pour une bonne raclette.`}
        </p>
        <p className="mt-3 text-[17px] leading-relaxed text-ink/80">
          Mais si tu aimerais apprendre à créer ta propre application, P-A peut te montrer comment faire. Prévois
          quelques écus, beaucoup de motivation… et éventuellement un café.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a href={LOGIN_HASH} className={pill.primary} onClick={onClose}>
            Retour à la connexion
          </a>
          <ContactButton />
        </div>
      </div>
    </dialog>
  );
}
