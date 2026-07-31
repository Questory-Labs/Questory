import { Injectable } from "@nestjs/common";
import {
  parseSearchQuery,
  shouldSearchScope,
  type SearchResult,
} from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../watch/users/users.service";
import { searchGames } from "./search-games";
import { searchCollections, searchFriends } from "./search-friends";
import { searchMusic } from "./search-music";
import { searchRead } from "./search-read";
import { searchWatch } from "./search-watch";

const EMPTY_MUSIC = { artists: [], albums: [], tracks: [] };
const EMPTY_WATCH = { movies: [], shows: [] };
const EMPTY_READ = { titles: [] };

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async search(userId: string, q: string, limit = 20): Promise<SearchResult> {
    const parsed = parseSearchQuery(q || "");
    const cap = Math.min(Math.max(limit, 1), 50);
    const readUser = runReadScope(parsed)
      ? await this.users.resolveUser(userId)
      : null;

    const runGames = shouldSearchScope(parsed, "game");
    const runFriends = shouldSearchScope(parsed, "friend");
    const runCollections = shouldSearchScope(parsed, "collection");
    const runMusic = runMusicScope(parsed);
    const runMovies = shouldSearchScope(parsed, "movie");
    const runShows = shouldSearchScope(parsed, "show");
    const runRead = runReadScope(parsed);

    const [gamesResult, friends, collections, music, movies, shows, readTitles] =
      await Promise.all([
        runGames
          ? searchGames(this.prisma, userId, parsed, cap)
          : Promise.resolve({ games: [], developers: [], publishers: [] }),
        runFriends
          ? searchFriends(this.prisma, userId, parsed, cap)
          : Promise.resolve([]),
        runCollections
          ? searchCollections(this.prisma, userId, parsed, cap)
          : Promise.resolve([]),
        runMusic
          ? searchMusic(this.prisma, userId, parsed, cap)
          : Promise.resolve(EMPTY_MUSIC),
        runMovies
          ? searchWatch(this.prisma, userId, parsed, cap, "movie")
          : Promise.resolve([]),
        runShows
          ? searchWatch(this.prisma, userId, parsed, cap, "show")
          : Promise.resolve([]),
        runRead && readUser
          ? searchRead(this.prisma, readUser.id, parsed, cap)
          : Promise.resolve([]),
      ]);

    return {
      games: gamesResult.games,
      friends,
      developers: gamesResult.developers,
      publishers: gamesResult.publishers,
      collections,
      music,
      watch: { movies, shows },
      read: { titles: readTitles },
    };
  }
}

function runMusicScope(parsed: ReturnType<typeof parseSearchQuery>) {
  return (
    shouldSearchScope(parsed, "music") ||
    shouldSearchScope(parsed, "artist") ||
    shouldSearchScope(parsed, "album") ||
    shouldSearchScope(parsed, "track")
  );
}

function runReadScope(parsed: ReturnType<typeof parseSearchQuery>) {
  return shouldSearchScope(parsed, "read");
}
