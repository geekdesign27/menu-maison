import { cx } from "./ui";

/**
 * The Menu Maison mark (identity kit v1): a smiling « m » with a fork. Drawn in
 * `currentColor`, so it takes the family theme colour. Below 32 px the charter
 * asks for the micro version, without the fork.
 */
export function LogoSymbol({
  size = 40,
  micro = false,
  className,
}: {
  size?: number;
  micro?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <g transform="translate(-2 0)">
        <path d="M12 49V29.5C12 22.6 17.2 17.5 24 17.5C29.1 17.5 32.2 20.8 33 25.1C34.9 20.5 38.8 17.5 44.3 17.5C51.5 17.5 56 22.8 56 29.5V49H47.7V30.4C47.7 27.6 46.2 25.4 43.4 25.4C40.6 25.4 38.5 27.5 38.5 30.4V49H30V30.4C30 27.6 28.5 25.4 25.8 25.4C23 25.4 20.7 27.6 20.7 30.4V49H12Z" />
        {!micro && (
          <path
            d="M29 8V15.8M34 6.5V15.8M39 8V15.8M29 15.8Q29 22 34 22Q39 22 39 15.8M34 22V31.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <path
          d="M23.5 53.4C29.1 58.4 37.2 58.4 42.9 53.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** App icon: the white mark on a rounded square of the theme's brand colour. */
export function AppIcon({
  size = 80,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center bg-brand text-white shadow-sm",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      role="img"
      aria-label="Menu Maison"
    >
      <LogoSymbol size={size * 0.77} micro={size < 32} />
    </span>
  );
}
