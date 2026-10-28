import { useState } from "react";
import { useMutation } from "convex/react";
import { KeyRound, Share2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { pseudoFromName } from "../../../convex/domain/auth";
import { useSession, type Member } from "../../lib/session";
import { useRun, useToast } from "../../lib/toast";
import { errorMessage } from "../../lib/format";
import { appUrl, shareLink } from "../../lib/share";
import { Button, Segmented, TextInput } from "../ui";

/**
 * Sign-in of a profile: its pseudo, and for the family admins a one-time link
 * to send, for a first sign-in or a forgotten password.
 */
export function MemberAccess({ member }: { member: Member }) {
  const { token, account } = useSession();
  const run = useRun();
  const toast = useToast();
  const setUsername = useMutation(api.access.setUsername);
  const setRole = useMutation(api.access.setRole);
  const resetLink = useMutation(api.access.resetLink);
  const [pseudo, setPseudo] = useState(member.username ?? "");
  const [link, setLink] = useState<string | null>(null);

  const isAdmin = account?.role === "admin";
  const isMe = account?.memberId === member._id;

  if (!isAdmin)
    return isMe && member.username ? (
      <p className="text-[15px]">
        Ton pseudo : <strong>{member.username}</strong>
      </p>
    ) : null;

  const savePseudo = async () => {
    if (pseudo.trim() === (member.username ?? "")) return;
    const saved = await run(
      () => setUsername({ token, id: member._id, username: pseudo }),
      "Pseudo enregistré",
    );
    setPseudo(saved ?? member.username ?? "");
    // An older link would still show the former pseudo
    if (saved) setLink(null);
  };

  const share = async (url: string) => {
    try {
      const done = await shareLink(
        url,
        `Voici ton lien Menu Maison pour choisir ton mot de passe. Ton pseudo : ${member.username}.`,
      );
      if (done === "copied") toast("Lien copié, colle-le dans un message.");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const createLink = async () => {
    const t = await run(() => resetLink({ token, id: member._id }));
    if (!t) return;
    // Shared on a second tap: the phone opens its share sheet only right after a touch
    setLink(appUrl(`/activer/${t}`));
  };

  return (
    <section className="grid gap-3 rounded-3xl bg-paper p-4 ring-1 ring-line">
      <h3 className="text-[17px] font-black">Accès</h3>
      <TextInput
        label="Pseudo"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder={pseudoFromName(member.name)}
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        onBlur={savePseudo}
      />
      {isMe || member.superadmin ? (
        <p className="text-[15px]">
          Rôle : <strong>{member.role === "admin" ? "admin" : "membre"}</strong>
        </p>
      ) : (
        <div>
          <span className="mb-1 block text-[15px] font-bold">Rôle</span>
          <Segmented
            label={`Rôle de ${member.name}`}
            value={member.role === "admin" ? "admin" : "membre"}
            onChange={(role) =>
              void run(
                () => setRole({ token, id: member._id, role }),
                role === "admin"
                  ? `${member.name} est admin`
                  : `${member.name} est membre`,
              )
            }
            options={[
              { value: "membre", label: "Membre" },
              { value: "admin", label: "Admin" },
            ]}
          />
          <p className="mt-1 text-[15px] text-muted">
            Un admin gère les profils, les accès et l'apparence de la famille.
          </p>
        </div>
      )}
      <p className="text-[15px] text-muted">
        {member.hasPassword
          ? "Accès activé : mot de passe choisi."
          : "Pas encore activé : envoie-lui son lien pour choisir son mot de passe."}
      </p>
      {isMe ? (
        <p className="text-[15px] text-muted">
          Mot de passe oublié : demande un nouveau lien à un autre admin de la
          famille.
        </p>
      ) : link ? (
        <div className="grid gap-2">
          <p className="text-[15px]">
            Lien prêt, valable {member.hasPassword ? "48 heures" : "14 jours"}{" "}
            et utilisable une fois. Ses autres appareils sont déconnectés.
          </p>
          <Button onClick={() => share(link)}>
            <Share2 size={20} /> Envoyer le lien
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={createLink}
          disabled={!member.username}
        >
          <KeyRound size={20} />{" "}
          {member.hasPassword
            ? "Mot de passe oublié : nouveau lien"
            : "Créer son lien d'activation"}
        </Button>
      )}
      {!member.username && (
        <p className="text-[15px] text-muted">Choisis d'abord un pseudo.</p>
      )}
    </section>
  );
}
