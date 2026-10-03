/** T023 — bottom tab route contract used by MainTabs. */
export const MAIN_TAB_ROUTES = [
  { name: "Home", title: "Home" },
  { name: "MyPodsTab", title: "MyPods" },
  { name: "Account", title: "Account" },
] as const;

export type MainTabName = (typeof MAIN_TAB_ROUTES)[number]["name"];
