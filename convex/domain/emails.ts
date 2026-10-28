// E-mails of Menu Maison: subject, branded HTML and plain text, in the
// family's language. Pure functions, tested with Vitest; convex/email.ts sends.
// Mail programs ignore stylesheets: everything is inline, in tables.
import type { Lang } from "./lang";

export type EmailKind =
  | "welcome"
  | "trialEnding"
  | "confirmed"
  | "paymentFailed"
  | "canceled"
  | "adminSignup"
  | "adminConverted"
  | "adminCanceled"
  | "adminPaymentFailed";

export interface EmailData {
  familyName: string;
  adminName: string;
  /** Date already written in the language (« mercredi 4 novembre »). */
  date?: string;
  /** Main button: activation, sign-in or subscription page. */
  link?: string;
  /** Sign-in link of the family (menumaison.ch/#/f/dupont). */
  loginLink?: string;
  /** Customer's e-mail (alerts to PA only). */
  email?: string;
  lang?: Lang;
  /** Totals for PA's alerts. */
  subscribers?: number;
}

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const NBSP = " ";
const COLORS = {
  cream: "#fff7ee",
  paper: "#ffffff",
  ink: "#2b2420",
  muted: "#6b6058",
  line: "#efe3d6",
  accent: "#c1511c",
};
const SITE = "https://menumaison.ch";

/** Values typed by families (names) go into HTML: never as markup. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Body {
  subject: string;
  title: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  after?: string[];
}

/** Texts of each e-mail; `{x}` filled from the data. Alerts to PA are in French only. */
const TEXTS: Record<Lang, Record<EmailKind, (d: EmailData) => Body>> = {
  fr: {
    welcome: (d) => ({
      subject: `Bienvenue dans Menu Maison, famille ${d.familyName}`,
      title: `Bienvenue ${d.adminName}${NBSP}!`,
      paragraphs: [
        `La famille «${NBSP}${d.familyName}${NBSP}» est prête. Ton essai gratuit dure jusqu'au ${d.date}, ensuite 20${NBSP}CHF sont débités chaque année. Tu peux résilier à tout moment depuis l'app.`,
        "Si tu n'as pas encore choisi ton mot de passe, fais-le avec ce bouton. Le lien est valable 7 jours.",
      ],
      button: d.link
        ? { label: "Choisir mon mot de passe", url: d.link }
        : undefined,
      after: [
        `Ensuite, connecte-toi avec le lien de ta famille${NBSP}: ${d.loginLink}`,
        "Ajoute l'app à l'écran d'accueil de ton téléphone, puis invite les autres membres depuis Réglages, Profils.",
      ],
    }),
    trialEnding: (d) => ({
      subject: "Ton essai de Menu Maison se termine bientôt",
      title: "Plus que 2 jours d'essai",
      paragraphs: [
        `Ton essai gratuit se termine le ${d.date}. Ce jour-là, 20${NBSP}CHF seront débités pour une année de Menu Maison pour toute la famille «${NBSP}${d.familyName}${NBSP}».`,
        "Rien à faire si tu continues. Pour arrêter, résilie avant cette date dans l'app, Réglages, Abonnement.",
      ],
      button: d.link
        ? { label: "Voir mon abonnement", url: d.link }
        : undefined,
    }),
    confirmed: (d) => ({
      subject: "Ton abonnement Menu Maison est confirmé",
      title: "Merci, c'est confirmé",
      paragraphs: [
        `Ton abonnement est actif pour la famille «${NBSP}${d.familyName}${NBSP}». Prochain renouvellement le ${d.date}, 20${NBSP}CHF.`,
        "Le reçu de Stripe arrive dans un e-mail séparé.",
      ],
      button: d.link ? { label: "Ouvrir Menu Maison", url: d.link } : undefined,
    }),
    paymentFailed: (d) => ({
      subject: "Le paiement de Menu Maison n'a pas abouti",
      title: "Le paiement n'a pas abouti",
      paragraphs: [
        `Le renouvellement de l'abonnement de la famille «${NBSP}${d.familyName}${NBSP}» a été refusé par ta banque.`,
        `Mets ta carte à jour avant le ${d.date}. Sinon, l'app passera en lecture seule (tes données sont gardées).`,
      ],
      button: d.link
        ? { label: "Mettre ma carte à jour", url: d.link }
        : undefined,
    }),
    canceled: (d) => ({
      subject: "Ton abonnement Menu Maison est résilié",
      title: "Résiliation enregistrée",
      paragraphs: [
        `L'abonnement de la famille «${NBSP}${d.familyName}${NBSP}» est résilié. L'app reste ouverte jusqu'au ${d.date}, puis passe en lecture seule.`,
        "Tes recettes et tes menus sont gardés. Tu peux réactiver l'abonnement à tout moment.",
      ],
      button: d.link ? { label: "Réactiver", url: d.link } : undefined,
    }),
    adminSignup: (d) => ({
      subject: `Nouvelle inscription : ${d.familyName}`,
      title: "Nouvelle inscription",
      paragraphs: [
        `Famille «${NBSP}${d.familyName}${NBSP}», admin ${d.adminName}, ${d.email ?? "e-mail inconnu"}, langue ${d.lang === "de" ? "allemand" : "français"}.`,
        `Essai gratuit jusqu'au ${d.date}.`,
      ],
      button: {
        label: "Ouvrir Super admin",
        url: `${SITE}/#/gestion/super-admin`,
      },
    }),
    adminConverted: (d) => ({
      subject: `Abonnement payé : ${d.familyName}`,
      title: "Essai converti",
      paragraphs: [
        `La famille «${NBSP}${d.familyName}${NBSP}» (${d.email ?? "e-mail inconnu"}) a payé ses 20${NBSP}CHF. Prochain renouvellement le ${d.date}.`,
        `Familles abonnées${NBSP}: ${d.subscribers ?? "?"}.`,
      ],
      button: {
        label: "Ouvrir Super admin",
        url: `${SITE}/#/gestion/super-admin`,
      },
    }),
    adminCanceled: (d) => ({
      subject: `Résiliation : ${d.familyName}`,
      title: "Résiliation",
      paragraphs: [
        `La famille «${NBSP}${d.familyName}${NBSP}» (${d.email ?? "e-mail inconnu"}) a résilié. Accès jusqu'au ${d.date}.`,
        "La raison éventuelle est dans le tableau de bord Stripe, fiche du client.",
      ],
      button: {
        label: "Ouvrir Super admin",
        url: `${SITE}/#/gestion/super-admin`,
      },
    }),
    adminPaymentFailed: (d) => ({
      subject: `Paiement échoué : ${d.familyName}`,
      title: "Paiement échoué",
      paragraphs: [
        `Le renouvellement de la famille «${NBSP}${d.familyName}${NBSP}» (${d.email ?? "e-mail inconnu"}) a été refusé. Stripe réessaie, la famille garde l'accès jusqu'au ${d.date}.`,
      ],
      button: {
        label: "Ouvrir Super admin",
        url: `${SITE}/#/gestion/super-admin`,
      },
    }),
  },
  de: {
    welcome: (d) => ({
      subject: `Willkommen bei Menu Maison, Familie ${d.familyName}`,
      title: `Willkommen, ${d.adminName}!`,
      paragraphs: [
        `Die Familie «${d.familyName}» ist bereit. Dein Gratis-Test dauert bis am ${d.date}, danach werden jedes Jahr 20 CHF belastet. Du kannst jederzeit in der App kündigen.`,
        "Falls du dein Passwort noch nicht gewählt hast, mach es mit diesem Knopf. Der Link ist 7 Tage gültig.",
      ],
      button: d.link
        ? { label: "Mein Passwort wählen", url: d.link }
        : undefined,
      after: [
        `Danach meldest du dich mit dem Link deiner Familie an: ${d.loginLink}`,
        "Füge die App zum Home-Bildschirm deines Handys hinzu und lade die anderen Mitglieder unter Einstellungen, Profile ein.",
      ],
    }),
    trialEnding: (d) => ({
      subject: "Dein Test von Menu Maison endet bald",
      title: "Noch 2 Tage Test",
      paragraphs: [
        `Dein Gratis-Test endet am ${d.date}. An diesem Tag werden 20 CHF für ein Jahr Menu Maison für die ganze Familie «${d.familyName}» belastet.`,
        "Wenn du weitermachst, musst du nichts tun. Zum Aufhören kündigst du vor diesem Datum in der App, Einstellungen, Abo.",
      ],
      button: d.link ? { label: "Mein Abo ansehen", url: d.link } : undefined,
    }),
    confirmed: (d) => ({
      subject: "Dein Abo von Menu Maison ist bestätigt",
      title: "Danke, es ist bestätigt",
      paragraphs: [
        `Dein Abo für die Familie «${d.familyName}» ist aktiv. Nächste Verlängerung am ${d.date}, 20 CHF.`,
        "Die Quittung von Stripe kommt in einer separaten E-Mail.",
      ],
      button: d.link ? { label: "Menu Maison öffnen", url: d.link } : undefined,
    }),
    paymentFailed: (d) => ({
      subject: "Die Zahlung für Menu Maison hat nicht geklappt",
      title: "Die Zahlung hat nicht geklappt",
      paragraphs: [
        `Die Verlängerung des Abos der Familie «${d.familyName}» wurde von deiner Bank abgelehnt.`,
        `Aktualisiere deine Karte bis am ${d.date}. Sonst ist die App nur noch lesbar (deine Daten bleiben erhalten).`,
      ],
      button: d.link
        ? { label: "Karte aktualisieren", url: d.link }
        : undefined,
    }),
    canceled: (d) => ({
      subject: "Dein Abo von Menu Maison ist gekündigt",
      title: "Kündigung gespeichert",
      paragraphs: [
        `Das Abo der Familie «${d.familyName}» ist gekündigt. Die App bleibt bis am ${d.date} offen und ist danach nur noch lesbar.`,
        "Deine Rezepte und Menüs bleiben erhalten. Du kannst das Abo jederzeit wieder aktivieren.",
      ],
      button: d.link ? { label: "Wieder aktivieren", url: d.link } : undefined,
    }),
    // Alerts go to PA, in French
    adminSignup: (d) => TEXTS.fr.adminSignup(d),
    adminConverted: (d) => TEXTS.fr.adminConverted(d),
    adminCanceled: (d) => TEXTS.fr.adminCanceled(d),
    adminPaymentFailed: (d) => TEXTS.fr.adminPaymentFailed(d),
  },
};

const FOOTER: Record<Lang, string> = {
  fr: "Menu Maison, les menus de la semaine et les courses en famille. Tu reçois cet e-mail pour l'abonnement de ta famille.",
  de: "Menu Maison, Wochenmenüs und Einkäufe für die ganze Familie. Du erhältst diese E-Mail wegen des Abos deiner Familie.",
};

/** The e-mail ready to send: names escaped in HTML, a text version for mail programs without HTML. */
export function renderEmail(
  kind: EmailKind,
  data: EmailData,
  lang: Lang,
): Email {
  const safe: EmailData = {
    ...data,
    familyName: escapeHtml(data.familyName),
    adminName: escapeHtml(data.adminName),
    email: data.email && escapeHtml(data.email),
  };
  const b = TEXTS[lang][kind](safe);
  const plain = TEXTS[lang][kind](data);
  const c = COLORS;
  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:${c.ink}">${text}</p>`;
  const button = b.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="background:${c.accent};border-radius:999px">` +
      `<a href="${escapeHtml(b.button.url)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none">${b.button.label}</a>` +
      `</td></tr></table>`
    : "";
  const html =
    `<!doctype html><html lang="${lang === "de" ? "de-CH" : "fr-CH"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>${b.subject}</title></head>` +
    `<body style="margin:0;padding:0;background:${c.cream};font-family:Nunito,'Segoe UI',Helvetica,Arial,sans-serif">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.cream}"><tr><td align="center" style="padding:28px 14px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">` +
    `<tr><td style="padding:0 6px 18px"><img src="${SITE}/brand/carotte-192.png" width="52" height="52" alt="Menu Maison" style="display:block;border-radius:12px"></td></tr>` +
    `<tr><td style="background:${c.paper};border:1px solid ${c.line};border-radius:20px;padding:28px 26px">` +
    `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;font-weight:900;color:${c.ink}">${b.title}</h1>` +
    b.paragraphs.map(p).join("") +
    button +
    (b.after ?? []).map(p).join("") +
    `</td></tr>` +
    `<tr><td style="padding:18px 6px;font-size:13px;line-height:1.5;color:${c.muted}">${FOOTER[lang]}<br><a href="${SITE}" style="color:${c.muted}">menumaison.ch</a></td></tr>` +
    `</table></td></tr></table></body></html>`;
  const text = [
    plain.title,
    "",
    ...plain.paragraphs,
    ...(plain.button
      ? ["", `${plain.button.label} : ${plain.button.url}`]
      : []),
    ...(plain.after?.length ? ["", ...plain.after] : []),
    "",
    "--",
    FOOTER[lang],
    SITE,
  ].join("\n");
  return { subject: plain.subject, html, text };
}

/** Every kind, for the previews in Super admin and the tests. */
export const EMAIL_KINDS: EmailKind[] = [
  "welcome",
  "trialEnding",
  "confirmed",
  "paymentFailed",
  "canceled",
  "adminSignup",
  "adminConverted",
  "adminCanceled",
  "adminPaymentFailed",
];
