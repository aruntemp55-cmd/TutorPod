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
  Account: undefined;
  Player: { podId: string };
  Generating: { podId: string; chapterTitle: string };
  StartPodcast: {
    standardId: string;
    sectionId: string;
    chapterId: string;
    chapterTitle: string;
  };
  /** @deprecated kept for deep links / old tests */
  Onboarding: undefined;
  Home: undefined;
  MyPodsTab: undefined;
  RaiseHand: { podId: string };
};
