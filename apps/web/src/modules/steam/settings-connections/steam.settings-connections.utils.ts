import type { SourcesDomain } from "@questorylabs/shared";
import type { ConnectionPill } from "./components/ConnectionModuleCard";
import { CONNECTION_PROVIDER_LABELS } from "./steam.settings-connections.constants";

export const providerLabel = (provider: string) =>
  CONNECTION_PROVIDER_LABELS[provider] ?? provider;

export const domainPills = (domain: SourcesDomain | undefined): ConnectionPill[] =>
  (domain?.providers ?? []).map((p) => ({
    key: p.provider,
    label: providerLabel(p.provider),
    state: p.connected ? (p.lastError ? "error" : "on") : "off",
  }));

export const gamesPills = ({
  steamConnected,
  qmonitorDeviceCount,
}: {
  steamConnected: boolean;
  qmonitorDeviceCount: number | undefined;
}): ConnectionPill[] => [
  { key: "steam", label: "Steam", state: steamConnected ? "on" : "off" },
  { key: "epic", label: "Epic Games", state: "off" },
  { key: "gog", label: "GOG", state: "off" },
  ...(qmonitorDeviceCount != null
    ? [
        {
          key: "qmonitor",
          label: `qMonitor · ${qmonitorDeviceCount} device${qmonitorDeviceCount === 1 ? "" : "s"}`,
          state: qmonitorDeviceCount > 0 ? ("on" as const) : ("off" as const),
        },
      ]
    : []),
];

export const countOn = (pills: ConnectionPill[]) =>
  pills.filter((p) => p.state !== "off").length;
