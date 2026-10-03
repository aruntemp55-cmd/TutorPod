/** Main home tile contract (Student UX v3). */
export const MAIN_HOME_TILES = [
  { key: "ask", title: "Ask any question" },
  { key: "mypods", title: "My Pods" },
  { key: "learning", title: "Learning Path" },
  { key: "subjects", title: "Subjects" },
] as const;

/** @deprecated tabs removed in v3 — kept for test name stability */
export const MAIN_TAB_ROUTES = [
  { name: "Home", title: "Home" },
  { name: "MyPodsTab", title: "MyPods" },
  { name: "Account", title: "Account" },
] as const;

export type MainTabName = (typeof MAIN_TAB_ROUTES)[number]["name"];
