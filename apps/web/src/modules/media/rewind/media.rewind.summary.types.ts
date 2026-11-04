export type RewindStatTile = {
  key: string;
  label: string;
  value: string;
  note?: string;
};

export type RewindRankItem = {
  id: string;
  name: string;
  value: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

export type RewindCategory = "games" | "music" | "watch" | "read";

export type RewindRankList = {
  key: string;
  title: string;
  category: RewindCategory;
  items: RewindRankItem[];
};

export type RewindBar = {
  key: string;
  label: string;
  value: number;
  weekend: boolean;
};

export type RewindHeroModel = {
  label: string;
  value: number;
  decimals: number;
  unit: string;
  note: string;
  bars: RewindBar[];
  daily: boolean;
  peak: string | null;
};

export type RewindSummary = {
  hero: RewindHeroModel;
  stats: RewindStatTile[];
  lists: RewindRankList[];
};
