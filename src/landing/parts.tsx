import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cx } from "../components/ui";
import { LOGIN_HASH } from "./entry";

// ---------- Page context ----------

export interface LandingValue {
  /** This phone keeps a sign-in: the buttons open the app instead of the sign-in screen. */
  signedIn: boolean;
  /** « En parler avec P-A », or null while no contact is configured. */
  contact: string | null;
  openNoInvite: () => void;
}

export const LandingContext = createContext<LandingValue>({
  signedIn: false,
  contact: null,
  openNoInvite: () => undefined,
});

export function useLanding() {
  return useContext(LandingContext);
}

/** Where « Se connecter » leads, and what it says on a phone already signed in. */
export function useLogin(label = "Se connecter") {
  const { signedIn } = useLanding();
  return signedIn
    ? { href: "#/", label: "Ouvrir Menu Maison" }
    : { href: LOGIN_HASH, label };
}

// ---------- In-page navigation ----------

/**
 * Scrolls to a section without touching the address: the fragment belongs
 * to the app's routes (#/courses…), not to the page's anchors.
 */
export function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  // Keyboard and screen reader users land where they asked to go
  const heading = target.querySelector<HTMLElement>("h1, h2");
  heading?.focus({ preventScroll: true });
}

export function SectionLink({
  to,
  className,
  children,
  ...rest
}: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <a
      {...rest}
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        scrollToSection(to);
      }}
    >
      {children}
    </a>
  );
}

// ---------- Layout ----------

/** Adds `is-in` once the element is on screen (see .lp-reveal). */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cx("lp-reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

const TONES = {
  cream: "bg-cream",
  paper: "bg-paper",
  peach: "bg-carrot-soft/60",
};

export function Section({
  id,
  tone = "cream",
  className,
  children,
}: {
  id: string;
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titre`}
      className={cx("relative scroll-mt-16 overflow-hidden py-20 sm:py-28", TONES[tone], className)}
    >
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">{children}</div>
    </section>
  );
}

export function Heading({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      id={`${id}-titre`}
      tabIndex={-1}
      className={cx(
        "text-[clamp(2rem,5.2vw,3.5rem)] leading-[1.04] font-black tracking-[-0.025em] text-balance outline-none",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("mt-5 max-w-[34rem] text-lg leading-relaxed text-muted sm:text-xl", className)}>
      {children}
    </p>
  );
}

/** A hand-written aside, the voice of the person who built the app. */
export function Note({
  children,
  className,
  tilt = -2,
}: {
  children: ReactNode;
  className?: string;
  tilt?: number;
}) {
  return (
    <span
      className={cx("lp-tilt block text-[17px] leading-snug font-semibold text-carrot-dark italic", className)}
      style={{ "--lp-tilt": `${tilt}deg` } as CSSProperties}
    >
      {children}
    </span>
  );
}

/** Marks an interactive example: local data, never the family's. */
export function DemoTag({ children = "Exemple, données fictives" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1 text-[13px] font-extrabold text-[#7a5600]">
      <span aria-hidden className="size-1.5 rounded-full bg-sun" />
      {children}
    </span>
  );
}

// ---------- Screenshots ----------

const SHOT = { width: 390, height: 844 };

/** A real screenshot of the app (demo family « Martin »), in a phone frame. */
export function Phone({
  src,
  alt,
  priority,
  size,
  className,
  style,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  /** Width classes, phone-sized by default. */
  size?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <figure className={cx("lp-phone shrink-0", size ?? "w-[min(78vw,290px)]", className)} style={style}>
      <img
        src={`${import.meta.env.BASE_URL}landing/${src}.webp`}
        alt={alt}
        width={SHOT.width}
        height={SHOT.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </figure>
  );
}

// ---------- Buttons ----------

const PILL =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-center text-[17px] font-extrabold transition duration-200 hover:-translate-y-0.5 active:translate-y-0";

export const pill = {
  primary: cx(
    PILL,
    "bg-carrot text-white shadow-[0_10px_22px_-12px_rgba(158,63,18,0.9)] hover:bg-carrot-dark",
  ),
  secondary: cx(PILL, "bg-paper text-ink ring-1 ring-line hover:ring-carrot/50"),
  large: "min-h-14 px-8 text-lg",
};
