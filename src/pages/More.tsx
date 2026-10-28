import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useMe, useSession } from "../lib/session";
import { Avatar, Card, Page } from "../components/ui";
import { FirstStepsEntry } from "../onboarding";
import { useT } from "../i18n/useT";
import type { MessageKey } from "../i18n";

const LINKS: {
  to: string;
  emoji: string;
  title: MessageKey;
  text: MessageKey;
}[] = [
  {
    to: "/envies",
    emoji: "💭",
    title: "common.more.wishes",
    text: "common.more.wishesText",
  },
  {
    to: "/menus-types",
    emoji: "🗂️",
    title: "common.more.templates",
    text: "common.more.templatesText",
  },
  {
    to: "/stats",
    emoji: "📊",
    title: "common.stats.title",
    text: "common.more.statsText",
  },
  {
    to: "/produits",
    emoji: "🧺",
    title: "common.settings.products",
    text: "common.more.productsText",
  },
  {
    to: "/magasins",
    emoji: "🏪",
    title: "common.more.stores",
    text: "common.more.storesText",
  },
  {
    to: "/reglages",
    emoji: "⚙️",
    title: "common.settings.title",
    text: "common.more.settingsText",
  },
];

export function MorePage() {
  const me = useMe();
  const { account } = useSession();
  const { t } = useT();
  return (
    <Page title={t("nav.more")}>
      {me && (
        <Card className="mb-4 flex items-center gap-3 p-4">
          <Avatar member={me} size={48} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black">{me.name}</div>
            <div className="text-[15px] text-muted">
              {account
                ? t("common.more.account", {
                    family: account.family.name,
                    username: account.username ?? "",
                  })
                : ""}
            </div>
          </div>
        </Card>
      )}
      <FirstStepsEntry />
      <Link to="/gestion" className="mb-3 hidden md:block">
        <Card className="flex items-center gap-4 bg-carrot-soft p-4">
          <span
            className="flex size-12 items-center justify-center rounded-2xl bg-paper text-2xl"
            aria-hidden
          >
            🖥️
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black">{t("common.more.gestion")}</div>
            <div className="text-[15px] text-muted">
              {t("common.more.gestionText")}
            </div>
          </div>
          <ChevronRight className="text-muted" />
        </Card>
      </Link>
      <div className="grid gap-3">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to}>
            <Card className="flex items-center gap-4 p-4">
              <span
                className="flex size-12 items-center justify-center rounded-2xl bg-carrot-soft text-2xl"
                aria-hidden
              >
                {l.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black">{t(l.title)}</div>
                <div className="text-[15px] text-muted">{t(l.text)}</div>
              </div>
              <ChevronRight className="text-muted" />
            </Card>
          </Link>
        ))}
      </div>
    </Page>
  );
}
