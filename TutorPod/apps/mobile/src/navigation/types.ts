export type RootStackParamList = {
  Splash: undefined;
  Login: { reason?: string } | undefined;
  Otp: { email: string; reason?: string };
  Settings: { mandatory?: boolean } | undefined;
  Main: undefined;
  Admin: undefined;
  AskQuestion: undefined;
  SubjectTopics: {
    standardId: string;
    sectionId: string;
    sectionName: string;
  };
  MyPods: undefined;
  LearningPath: undefined;
  Player: { podId: string };
  Generating: { podId: string; chapterTitle: string };
  StartPodcast: {
    standardId: string;
    sectionId: string;
    chapterId: string;
    chapterTitle: string;
  };
  /** @deprecated v3: Login is initial. Screen file kept, not registered. */
  Onboarding: undefined;
  /**
   * @deprecated v3: Student Main is home. FilterPills/HomeScreen kept for
   * reference; Learning Path lives on LearningPath (from Main).
   */
  Home: undefined;
  MyPodsTab: undefined;
  /** @deprecated v3: Settings is the live profile. Not registered. */
  Account: undefined;
  /** @deprecated Player raise-hand modal is source of truth. Not registered. */
  RaiseHand: { podId: string };
};
