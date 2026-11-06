export type TrackSeed = [title: string, durationMs: number, featured?: string[]];

export type ArtistSeed = {
  name: string;
  genres: string[];
  weight: number;
  phase: number;
  firstDayOffset?: number;
  lastDayOffset?: number;
  albums: Array<{
    title: string;
    year: number;
    moods: string[];
    tracks: TrackSeed[];
  }>;
  singles?: Array<{ moods: string[]; track: TrackSeed }>;
};

export const ARTIST_SEEDS: ArtistSeed[] = [
  {
    name: "Radiohead",
    genres: ["Alternative Rock", "Art Rock"],
    weight: 10,
    phase: 0.4,
    albums: [
      {
        title: "In Rainbows",
        year: 2007,
        moods: ["Melancholic", "Atmospheric"],
        tracks: [
          ["Weird Fishes/Arpeggi", 318000],
          ["Reckoner", 290000],
          ["Nude", 255000],
          ["All I Need", 228000],
        ],
      },
      {
        title: "OK Computer",
        year: 1997,
        moods: ["Melancholic", "Brooding"],
        tracks: [
          ["Paranoid Android", 387000],
          ["Karma Police", 264000],
          ["No Surprises", 229000],
        ],
      },
    ],
  },
  {
    name: "Daft Punk",
    genres: ["French House", "Electronic"],
    weight: 9,
    phase: 2.1,
    albums: [
      {
        title: "Random Access Memories",
        year: 2013,
        moods: ["Groovy", "Uplifting"],
        tracks: [
          ["Get Lucky", 369000, ["Pharrell Williams", "Nile Rodgers"]],
          ["Instant Crush", 337000, ["Julian Casablancas"]],
          ["Giorgio by Moroder", 544000],
        ],
      },
      {
        title: "Discovery",
        year: 2001,
        moods: ["Euphoric", "Groovy"],
        tracks: [
          ["One More Time", 320000],
          ["Harder Better Faster Stronger", 224000],
          ["Digital Love", 301000],
        ],
      },
    ],
  },
  {
    name: "Tame Impala",
    genres: ["Psychedelic Rock", "Synthpop"],
    weight: 8,
    phase: 4.2,
    albums: [
      {
        title: "Currents",
        year: 2015,
        moods: ["Dreamy", "Groovy"],
        tracks: [
          ["Let It Happen", 467000],
          ["The Less I Know the Better", 216000],
          ["New Person, Same Old Mistakes", 363000],
        ],
      },
      {
        title: "Lonerism",
        year: 2012,
        moods: ["Dreamy", "Atmospheric"],
        tracks: [
          ["Feels Like We Only Go Backwards", 193000],
          ["Elephant", 211000],
        ],
      },
    ],
  },
  {
    name: "Kendrick Lamar",
    genres: ["Hip Hop", "Conscious Rap"],
    weight: 7,
    phase: 1.2,
    albums: [
      {
        title: "To Pimp a Butterfly",
        year: 2015,
        moods: ["Intense", "Uplifting"],
        tracks: [
          ["King Kunta", 234000],
          ["Alright", 219000],
        ],
      },
      {
        title: "DAMN.",
        year: 2017,
        moods: ["Intense", "Brooding"],
        tracks: [
          ["HUMBLE.", 177000],
          ["DNA.", 185000],
        ],
      },
      {
        title: "good kid, m.A.A.d city",
        year: 2012,
        moods: ["Brooding", "Groovy"],
        tracks: [["Money Trees", 386000, ["Jay Rock"]]],
      },
    ],
  },
  {
    name: "Beach House",
    genres: ["Dream Pop", "Indie"],
    weight: 6,
    phase: 3.3,
    albums: [
      {
        title: "Bloom",
        year: 2012,
        moods: ["Dreamy", "Melancholic"],
        tracks: [
          ["Myth", 258000],
          ["Wild", 318000],
        ],
      },
      {
        title: "Depression Cherry",
        year: 2015,
        moods: ["Dreamy", "Atmospheric"],
        tracks: [
          ["Space Song", 320000],
          ["Levitation", 398000],
        ],
      },
    ],
  },
  {
    name: "Fleetwood Mac",
    genres: ["Soft Rock", "Classic Rock"],
    weight: 5,
    phase: 5.1,
    albums: [
      {
        title: "Rumours",
        year: 1977,
        moods: ["Nostalgic", "Uplifting"],
        tracks: [
          ["Dreams", 257000],
          ["The Chain", 271000],
          ["Go Your Own Way", 218000],
        ],
      },
    ],
  },
  {
    name: "Aphex Twin",
    genres: ["Ambient Techno", "Electronic"],
    weight: 4,
    phase: 0.9,
    albums: [
      {
        title: "Selected Ambient Works 85-92",
        year: 1992,
        moods: ["Atmospheric", "Focus"],
        tracks: [
          ["Xtal", 291000],
          ["Ageispolis", 322000],
        ],
      },
    ],
    singles: [{ moods: ["Intense"], track: ["Windowlicker", 366000] }],
  },
  {
    name: "Bon Iver",
    genres: ["Indie Folk", "Indie"],
    weight: 4,
    phase: 2.8,
    albums: [
      {
        title: "For Emma, Forever Ago",
        year: 2007,
        moods: ["Melancholic", "Nostalgic"],
        tracks: [
          ["Skinny Love", 238000],
          ["Re: Stacks", 401000],
        ],
      },
    ],
  },
  {
    name: "Phoebe Bridgers",
    genres: ["Indie Rock", "Indie Folk"],
    weight: 6,
    phase: 3.9,
    firstDayOffset: 200,
    albums: [
      {
        title: "Punisher",
        year: 2020,
        moods: ["Melancholic", "Dreamy"],
        tracks: [
          ["Kyoto", 184000],
          ["Garden Song", 219000],
          ["I Know the End", 344000],
        ],
      },
    ],
  },
  {
    name: "The Strokes",
    genres: ["Garage Rock", "Indie Rock"],
    weight: 5,
    phase: 1.7,
    lastDayOffset: 365,
    albums: [
      {
        title: "Is This It",
        year: 2001,
        moods: ["Nostalgic", "Intense"],
        tracks: [
          ["Last Nite", 197000],
          ["Someday", 187000],
        ],
      },
    ],
  },
  {
    name: "Massive Attack",
    genres: ["Trip Hop", "Electronic"],
    weight: 4,
    phase: 4.9,
    albums: [
      {
        title: "Mezzanine",
        year: 1998,
        moods: ["Brooding", "Atmospheric"],
        tracks: [
          ["Teardrop", 330000],
          ["Angel", 379000],
        ],
      },
    ],
  },
  {
    name: "Mitski",
    genres: ["Indie Rock", "Art Pop"],
    weight: 5,
    phase: 0.1,
    firstDayOffset: 20,
    albums: [
      {
        title: "Be the Cowboy",
        year: 2018,
        moods: ["Melancholic", "Intense"],
        tracks: [
          ["Nobody", 193000],
          ["Washing Machine Heart", 128000],
        ],
      },
    ],
  },
  {
    name: "Caribou",
    genres: ["Electronic", "Indie"],
    weight: 4,
    phase: 2.4,
    firstDayOffset: 5,
    albums: [
      {
        title: "Our Love",
        year: 2014,
        moods: ["Euphoric", "Dreamy"],
        tracks: [["Can't Do Without You", 236000]],
      },
    ],
  },
];

export const FEATURED_ONLY = [
  "Pharrell Williams",
  "Nile Rodgers",
  "Julian Casablancas",
  "Jay Rock",
];
