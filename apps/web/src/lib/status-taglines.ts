/**
 * Iconic gaming / movie / lyric quotes shown on loading and error states.
 * One curated pool per situation — this file is the single edit point for copy.
 */

export type StatusTagline = {
  /** 1–2 quote lines, rendered stacked in the full layout. */
  readonly lines: readonly string[];
  /** Attribution, e.g. "The Room", "Portal", "Adele". */
  readonly source: string;
};

export type TaglineContext = "loading" | "notFound" | "serverError";

const LOADING_TAGLINES: readonly StatusTagline[] = [
  // Games
  { lines: ["Hey you, you're finally awake."], source: "Skyrim" },
  { lines: ["Stay awhile and listen."], source: "Diablo II" },
  { lines: ["It's dangerous to go alone! Take this."], source: "The Legend of Zelda" },
  { lines: ["Wake up, Mr. Freeman.", "Wake up and smell the ashes."], source: "Half-Life 2" },
  // Movies
  { lines: ["Hold on to your butts."], source: "Jurassic Park" },
  { lines: ["Roads?", "Where we're going, we don't need roads."], source: "Back to the Future" },
  { lines: ["A wizard is never late.", "He arrives precisely when he means to."], source: "The Lord of the Rings" },
  { lines: ["Fasten your seatbelts.", "It's going to be a bumpy night."], source: "All About Eve" },
  // Lyrics
  { lines: ["The waiting is the hardest part."], source: "Tom Petty" },
  { lines: ["Harder, Better, Faster, Stronger."], source: "Daft Punk" },
  { lines: ["Don't stop me now.", "I'm having such a good time."], source: "Queen" },
  { lines: ["Wait a minute, Mr. Postman."], source: "The Marvelettes" },
] as const;

const NOT_FOUND_TAGLINES: readonly StatusTagline[] = [
  // Games
  { lines: ["Thank you Mario!", "But our princess is in another castle!"], source: "Super Mario Bros." },
  { lines: ["The cake is a lie."], source: "Portal" },
  { lines: ["Mission failed, we'll get 'em next time."], source: "Call of Duty" },
  { lines: ["This isn't the time to use that!"], source: "Prof. Oak (Pokémon)" },
  // Movies
  { lines: ["These aren't the droids you're looking for."], source: "Star Wars" },
  { lines: ["Toto, I've a feeling we're not in Kansas anymore."], source: "The Wizard of Oz" },
  { lines: ["You shall not pass!"], source: "The Lord of the Rings" },
  { lines: ["The Truth Is Out There.", "This page isn't."], source: "The X-Files" },
  // Lyrics
  { lines: ["I still haven't found what I'm looking for."], source: "U2" },
  { lines: ["Hello, is it me you're looking for?"], source: "Lionel Richie" },
  { lines: ["Never gonna give you up, never gonna let you down."], source: "Rick Astley" },
  { lines: ["Nowhere Man, please listen.", "You don't know what you're missing."], source: "The Beatles" },
] as const;

const SERVER_ERROR_TAGLINES: readonly StatusTagline[] = [
  // Games
  { lines: ["YOU DIED"], source: "Dark Souls" },
  { lines: ["Snake? Snake?! SNAAAAAKE!"], source: "Metal Gear Solid" },
  { lines: ["WASTED"], source: "Grand Theft Auto V" },
  { lines: ["All your base are belong to us."], source: "Zero Wing" },
  // Movies
  { lines: ["Houston, we have a problem."], source: "Apollo 13" },
  { lines: ["Game over, man! Game over!"], source: "Aliens" },
  { lines: ["I'm sorry, Dave. I'm afraid I can't do that."], source: "2001: A Space Odyssey" },
  { lines: ["Have you tried turning it off and on again?"], source: "The IT Crowd" },
  // Lyrics
  { lines: ["Hello darkness, my old friend."], source: "Simon & Garfunkel" },
  { lines: ["Oops!... I did it again."], source: "Britney Spears" },
  { lines: ["It's the end of the world as we know it,", "and I feel fine."], source: "R.E.M." },
  { lines: ["When you try your best, but you don't succeed."], source: "Coldplay" },
] as const;

const POOLS: Record<TaglineContext, readonly StatusTagline[]> = {
  loading: LOADING_TAGLINES,
  notFound: NOT_FOUND_TAGLINES,
  serverError: SERVER_ERROR_TAGLINES,
};

/**
 * Returns the full pool of taglines for a given context.
 */
export function taglinePool(context: TaglineContext): readonly StatusTagline[] {
  return POOLS[context];
}

/**
 * Pick a random tagline index from a pool, safely avoiding an immediate repeat
 * without risking an infinite while-loop.
 */
export function pickTaglineIndex(
  context: TaglineContext,
  excludeIndex?: number,
): number {
  const pool = POOLS[context];
  const length = pool.length;

  if (length === 0) return -1;
  if (length === 1) return 0;

  // If we have a valid index to exclude, pick from the remaining (length - 1) options
  if (excludeIndex !== undefined && excludeIndex >= 0 && excludeIndex < length) {
    const randomIndex = Math.floor(Math.random() * (length - 1));
    // Shift the index up by 1 if it hits or passes the excluded index
    return randomIndex >= excludeIndex ? randomIndex + 1 : randomIndex;
  }

  // Standard random pick
  return Math.floor(Math.random() * length);
}

/**
 * Retrieves a random tagline object for the given context.
 */
export function pickTagline(
  context: TaglineContext,
  excludeIndex?: number,
): StatusTagline {
  const index = pickTaglineIndex(context, excludeIndex);
  // Fallback to the first item if something goes wrong (e.g., empty pool)
  return POOLS[context][index] ?? { lines: ["Loading..."], source: "System" };
}

/** 
 * One-line form for compact inline loaders: “quote” — Source 
 */
export function formatTaglineCompact(tagline: StatusTagline): string {
  return `“${tagline.lines.join(" ")}” — ${tagline.source}`;
}