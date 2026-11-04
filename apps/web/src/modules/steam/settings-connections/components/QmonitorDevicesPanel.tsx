"use client";

import { useState, type CSSProperties } from "react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type { QmonitorDevice, QmonitorDeviceList } from "@questorylabs/shared";
import { Button, Dialog, ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { formatDate, formatRelativePlayed } from "@/lib/dates";

const deviceName = (d: QmonitorDevice) => d.label || "Unnamed device";

export const QmonitorDevicesPanel = ({
  devices,
  revokeDevice,
  revokeError,
  index,
}: {
  devices: UseResourceResult<QmonitorDeviceList>;
  revokeDevice: UseActionResult<unknown, string>;
  revokeError: string | null;
  index: number;
}) => {
  const [pending, setPending] = useState<QmonitorDevice | null>(null);
  const active = (devices.value?.devices ?? []).filter((d) => !d.revokedAt);
  return (
    <section
      aria-labelledby="qmonitor-devices"
      className="panel q-in px-[22px] py-5"
      style={{ "--i": index } as CSSProperties}
    >
      <h2 id="qmonitor-devices" className="text-[17px] font-normal">
        qMonitor devices
      </h2>
      <p className="mt-0.5 text-sm text-[var(--muted)]">
        Desktop apps that report your play sessions. Revoking a device stops it from reporting.
      </p>
      <ResourceStatus
        failed={devices.failed}
        empty={devices.empty}
        loading={<SkeletonListRows count={2} className="mt-3" />}
        error={
          <p className="mt-3 text-sm text-[var(--danger)]">Could not load qMonitor devices.</p>
        }
      >
        {active.length ? (
          <ul className="-mx-2.5 mt-3">
            {active.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-2xl px-2.5 py-3 transition-colors duration-300 hover:bg-white/[0.03]"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${d.lastUsedAt ? "bg-[var(--ok)]" : "bg-[var(--faint)]"}`}
                />
                <span className="min-w-0 flex-[1_1_200px]">
                  <span className="block font-normal">{deviceName(d)}</span>
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    {d.lastUsedAt ? `Last seen ${formatRelativePlayed(d.lastUsedAt)}` : "Never seen"}
                    {` · added ${formatDate(d.createdAt)}`}
                  </span>
                </span>
                <Button
                  variant="ghost-danger"
                  size="sm"
                  aria-label={`Revoke ${deviceName(d)}`}
                  disabled={revokeDevice.busy}
                  onClick={() => setPending(d)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No qMonitor devices yet.</p>
        )}
      </ResourceStatus>
      {revokeError ? (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {revokeError}
        </p>
      ) : null}
      <Dialog open={pending != null} onClose={() => setPending(null)} title="Revoke device?">
        <p className="text-sm text-[var(--muted)]">
          {pending ? deviceName(pending) : ""} will stop reporting play sessions. Sign in again from
          qMonitor to reconnect it.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (pending) revokeDevice.submit(pending.id);
              setPending(null);
            }}
          >
            Revoke device
          </Button>
        </div>
      </Dialog>
    </section>
  );
};
