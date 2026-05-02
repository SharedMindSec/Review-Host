import Constants from "expo-constants";

export const API_BASE: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  "https://reformed.luls.lol";

export const FAVORITES_KEY = "reformed-watch:favorites:v1";
export const HISTORY_KEY = "reformed-watch:history:v1";
export const NOTES_KEY = "reformed-watch:notes:v1";
export const HISTORY_LIMIT = 12;

export const PRIVACY_POLICY_URL = "https://reformed.luls.lol/privacy";
export const CONTACT_URL = "https://reformed.luls.lol/contact";
export const APP_VERSION = "1.0.1";

export const CATEGORY_COLORS: Record<string, string> = {
  reformed: "#4d88c7",
  presbyterian: "#4779d2",
  covenanter: "#3fa4c8",
  puritan: "#c94568",
  calvinist: "#53a67a",
  "biblical-archaeology": "#d0a154",
  documentaries: "#d48343",
  movies: "#a966c7",
  education: "#4fb1c9",
  debates: "#df7357",
  general: "#95a3bc",
  cartoons: "#e8c654",
  news: "#e4434f",
  homemaking: "#c99474",
};
