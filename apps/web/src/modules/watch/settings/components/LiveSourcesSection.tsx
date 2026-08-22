"use client";

import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { ListProviderCard } from "@/components/sources/ListProviderCard";
import { SourcesSectionHeading } from "@/components/sources/SourcesSectionHeading";
import { LetterboxdConnectCard } from "./LetterboxdConnectCard";
import { Panel } from "@/components/ui";
import { getWatchUrl, watchFetch, watchUrl } from "@/lib/watch";
import { WATCH_ANILIST } from "../watch.settings.constants";
import type { WatchSettingsViewProps } from "../watch.settings.types";
import { formatLastSync } from "../watch.settings.utils";
import { SourceCard } from "./SourceCard";
import { StatusPill } from "./StatusPill";

type LiveProps = Pick<
  WatchSettingsViewProps,
  | "trakt"
  | "traktConnected"
  | "showTrakt"
  | "showAnilist"
  | "showWebhook"
  | "showingLive"
  | "webhookActive"
  | "chooserOptions"
  | "addOpen"
  | "setAddOpen"
  | "selectSource"
>;

export const LiveSourcesSection = ({
  trakt,
  traktConnected,
  showTrakt,
  showAnilist,
  showWebhook,
  showingLive,
  webhookActive,
  chooserOptions,
  addOpen,
  setAddOpen,
  selectSource,
}: LiveProps) => (
  <section className="mb-10">
    <SourcesSectionHeading
      eyebrow="Live"
      title="Live sources"
      description="Active connections that sync ongoing watches."
      action={
        chooserOptions.length > 0 && showingLive ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setAddOpen((v) => !v)}
          >
            {addOpen ? "Cancel" : "Add source"}
          </button>
        ) : null
      }
    />

    {!showingLive ? (
      <Panel className="p-5">
        <p className="text-sm text-[var(--ink)]">No live source yet.</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Connect Trakt or AniList, or set up Plex / Jellyfin webhooks.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {chooserOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="btn btn-secondary"
              onClick={() => selectSource(opt.id)}
            >
              {opt.id === "webhook" ? "Set up" : "Connect"} {opt.label}
            </button>
          ))}
        </div>
      </Panel>
    ) : null}

    {addOpen && chooserOptions.length > 0 && showingLive ? (
      <Panel className="mb-4 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
          Add source
        </p>
        <ul className="mt-3 space-y-2">
          {chooserOptions.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2.5 text-left hover:border-[var(--muted)]"
                onClick={() => selectSource(opt.id)}
              >
                <span>
                  <span className="block text-sm text-[var(--ink)]">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--faint)]">
                    {opt.hint}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-[var(--accent)]">
                  {opt.id === "webhook" ? "Set up" : "Connect"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    ) : null}

    {showingLive ? (
      <div className="grid gap-4 md:grid-cols-2">
        {showTrakt ? (
          <SourceCard
            label="OAuth"
            title="Trakt"
            blurb={
              traktConnected
                ? `Connected · last sync ${formatLastSync(trakt.value?.lastSyncedAt)}`
                : "Connect Trakt to sync your watched history and keep Watch up to date."
            }
            status={
              traktConnected ? (
                <StatusPill tone="ok">Connected</StatusPill>
              ) : (
                <StatusPill tone="idle">Connect</StatusPill>
              )
            }
          >
            <div className="flex flex-wrap gap-3">
              <a href={watchUrl("/trakt/authorize")} className="btn btn-secondary">
                {traktConnected ? "Reconnect Trakt" : "Connect Trakt"}
              </a>
            </div>
          </SourceCard>
        ) : null}

        {showAnilist ? (
          <ListProviderCard
            provider={WATCH_ANILIST}
            queryKeyPrefix="watch"
            fetchFn={watchFetch}
            urlFn={watchUrl}
          />
        ) : null}

        {showWebhook ? (
          <SourceCard
            label="Live ingest"
            title="Plex / Jellyfin"
            blurb="Point player webhooks at these URLs, then generate a personal key."
            status={
              webhookActive ? (
                <StatusPill tone="ok">Active</StatusPill>
              ) : (
                <StatusPill tone="idle">Setup</StatusPill>
              )
            }
          >
            <ul className="mb-4 space-y-1.5 rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
              <li className="break-all">
                <span className="text-[var(--faint)]">POST</span> {getWatchUrl()}
                /webhooks/plex
              </li>
              <li className="break-all">
                <span className="text-[var(--faint)]">POST</span> {getWatchUrl()}
                /webhooks/jellyfin
              </li>
            </ul>
            <ApiKeyPanel
              embedded
              type="watch_webhook"
              title="Webhook key"
              description="Shown once when generated. Rotate anytime."
            />
          </SourceCard>
        ) : null}

        <LetterboxdConnectCard />
      </div>
    ) : null}
  </section>
);
