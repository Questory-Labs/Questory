"use client";

import { useMemo, useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import {
  fetchGuardrailSettings,
  saveGuardrailSettings,
  type GuardrailSettings,
} from "@/lib/enterprise-api";
import type { DraftState } from "./enterprise.guardrails.types";
import {
  draftToPayload,
  settingsToDraft,
  severeAllowDowngrades,
} from "./enterprise.guardrails.utils";

export const GuardrailsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const { enabled, isLoading } = useEnterpriseEnabled();
  const settings = useResource({
    id: ["enterprise-guardrails"],
    load: fetchGuardrailSettings,
    when: enabled,
    freshFor: 30_000,
    retries: 1,
  });

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const saved = useMemo(
    () => settingsToDraft(settings.value),
    [settings.value],
  );

  const rows = draft ?? saved;

  const save = useAction({
    run: (payload: GuardrailSettings) => saveGuardrailSettings(payload),
    onSuccess: (data) => {
      store.push(["enterprise-guardrails"], data);
      setDraft(null);
      setConfirmOpen(false);
    },
  });

  const dirty = draft !== null;

  const updateDraft = (patch: Partial<DraftState>) => {
    setDraft({ ...rows, ...patch });
  };

  const requestSave = () => {
    if (!draft) return;
    const downgrades = severeAllowDowngrades(saved, draft);
    if (downgrades.length > 0) {
      setConfirmOpen(true);
      return;
    }
    save.submit(draftToPayload(draft));
  };

  return cloneElements(children, {
    enabled,
    isLoading,
    settings,
    rows,
    saved,
    draft,
    dirty,
    confirmOpen,
    save,
    updateDraft,
    requestSave,
    setDraft,
    setConfirmOpen,
  });
};
