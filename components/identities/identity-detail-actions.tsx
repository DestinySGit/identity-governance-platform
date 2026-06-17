"use client";

import { useRouter } from "next/navigation";
import { disableIdentity } from "@/app/actions/identities";
import { IdentityFormDialog } from "@/components/identities/identity-form-dialog";
import { Button } from "@/components/ui/button";
import type { Identity } from "@/types/database.types";

interface IdentityDetailActionsProps {
  identity: Identity;
}

export function IdentityDetailActions({ identity }: IdentityDetailActionsProps) {
  const router = useRouter();

  async function handleDisable() {
    if (!confirm("Disable this identity?")) return;
    await disableIdentity(identity.id);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <IdentityFormDialog
        identity={identity}
        trigger={<Button variant="outline">Edit</Button>}
      />
      {identity.status === "active" && (
        <Button variant="destructive" onClick={handleDisable}>
          Disable
        </Button>
      )}
    </div>
  );
}
