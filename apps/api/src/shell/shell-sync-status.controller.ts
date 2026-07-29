import { Controller, Get, MessageEvent, Query, Sse, UseGuards } from "@nestjs/common";
import { Observable, defer, distinctUntilChanged, expand, interval, map, merge, switchMap, timer } from "rxjs";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  ShellSyncStatusService,
  type ShellSyncModules,
} from "./shell-sync-status.service";

function parseModules(query: Record<string, string | undefined>): ShellSyncModules {
  const flag = (key: string) => {
    const v = (query[key] ?? "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  };
  return {
    steam: query.steam === undefined ? true : flag("steam"),
    music: flag("music"),
    watch: flag("watch"),
    read: flag("read"),
  };
}

@Controller("shell")
@UseGuards(SteamAuthGuard)
export class ShellSyncStatusController {
  constructor(private readonly shell: ShellSyncStatusService) {}

  @Get("sync-status")
  async status(
    @CurrentUser() user: { userId: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.shell.getStatus(user.userId, parseModules(query));
  }

  @Sse("sync-status/stream")
  stream(
    @CurrentUser() user: { userId: string },
    @Query() query: Record<string, string | undefined>,
  ): Observable<MessageEvent> {
    const modules = parseModules(query);
    const userId = user.userId;

    const data$ = defer(() => this.shell.getStatus(userId, modules)).pipe(
      expand((status) =>
        timer(this.shell.pollIntervalMs(status)).pipe(
          switchMap(() => this.shell.getStatus(userId, modules)),
        ),
      ),
      distinctUntilChanged(
        (a, b) => this.shell.fingerprint(a) === this.shell.fingerprint(b),
      ),
      map((status) => ({
        data: JSON.stringify(status),
      })),
    );

    const keepalive$ = interval(25_000).pipe(
      map(() => ({ data: "ping", type: "ping" } satisfies MessageEvent)),
    );

    return merge(data$, keepalive$);
  }
}
