import { z } from "zod";

const StoreSchema = z.enum(["steam", "epic", "gog"]);

export const CostRoiRowSchema = z.object({
  gameId: z.string().optional(),
  appId: z.number().nullable(),
  name: z.string(),
  headerImage: z.string().nullable().optional(),
  stores: z.array(StoreSchema).optional(),
  amount: z.number(),
  currentPrice: z.number().nullable(),
  lowestPrice: z.number().nullable(),
  hours: z.number(),
  costPerHour: z.number().nullable(),
  priceSource: z.enum(["paid", "store"]),
});
export type CostRoiRow = z.infer<typeof CostRoiRowSchema>;

export const CostPlaytimeBucketSchema = z.object({
  name: z.string(),
  amount: z.number(),
  count: z.number(),
});
export type CostPlaytimeBucket = z.infer<typeof CostPlaytimeBucketSchema>;

export const CostLibraryMixSchema = z.object({
  paid: z.object({ count: z.number(), amount: z.number() }),
  free: z.object({ count: z.number() }),
});
export type CostLibraryMix = z.infer<typeof CostLibraryMixSchema>;

export const CostSummarySchema = z.object({
  lifetimeSpending: z.number(),
  lifetimeAtCurrent: z.number(),
  lifetimeAtLowest: z.number(),
  pricedGameCount: z.number(),
  librarySize: z.number(),
  usingStoreEstimates: z.boolean(),
  currency: z.string(),
  costPerHour: z.number(),
  moneyWasted: z.number(),
  neverPlayedCount: z.number(),
  underOneHourCount: z.number(),
  underOneHourValue: z.number(),
  salePurchaseCount: z.number(),
  averageDiscount: z.number(),
  totalHours: z.number(),
  paidGameCount: z.number(),
  freeGameCount: z.number(),
  unplayedValue: z.number(),
  playtimeBuckets: z.array(CostPlaytimeBucketSchema),
  libraryMix: CostLibraryMixSchema,
  shelfware: z.array(CostRoiRowSchema),
  byGenre: z.array(z.object({ genre: z.string(), amount: z.number() })),
  byPublisher: z.array(z.object({ publisher: z.string(), amount: z.number() })),
});
export type CostSummary = z.infer<typeof CostSummarySchema>;

export const CostRoiPageSchema = z.object({
  items: z.array(CostRoiRowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type CostRoiPage = z.infer<typeof CostRoiPageSchema>;

export const CostRoiSortSchema = z.enum(["best", "worst"]);
export type CostRoiSort = z.infer<typeof CostRoiSortSchema>;

export const CostRoiValueFilterSchema = z.enum(["paid", "free", "all"]);
export type CostRoiValueFilter = z.infer<typeof CostRoiValueFilterSchema>;
