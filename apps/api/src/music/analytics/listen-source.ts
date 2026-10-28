import type { Prisma } from "../../generated/prisma/client";
import type { MusicListenSource } from "@questorylabs/shared";
import { containsInsensitive } from "../../search/search-text";
import {
  LISTEN_SOURCE_IMPORT_CLIENT_SUFFIX,
  LISTEN_SOURCE_LASTFM_CLIENTS,
} from "./analytics.constants";

export function listenSourceWhere(
  source: MusicListenSource,
): Prisma.ListenWhereInput {
  const lastfm = [...LISTEN_SOURCE_LASTFM_CLIENTS];
  if (source === "lastfm") {
    return { submissionClient: { in: lastfm } };
  }
  if (source === "imports") {
    return {
      submissionClient: { endsWith: LISTEN_SOURCE_IMPORT_CLIENT_SUFFIX },
    };
  }
  return {
    OR: [
      { submissionClient: null },
      {
        AND: [
          { submissionClient: { notIn: lastfm } },
          {
            NOT: {
              submissionClient: { endsWith: LISTEN_SOURCE_IMPORT_CLIENT_SUFFIX },
            },
          },
        ],
      },
    ],
  };
}

export function listenSearchWhere(q: string): Prisma.ListenWhereInput {
  const match = containsInsensitive(q);
  return {
    track: {
      OR: [
        { title: match },
        { displayName: match },
        { artist: { name: match } },
        { release: { title: match } },
        { release: { displayName: match } },
      ],
    },
  };
}
