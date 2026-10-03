export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Main: undefined;
  Admin: undefined;
  Home: undefined;
  MyPodsTab: undefined;
  Account: undefined;
  Login: { reason?: string } | undefined;
  Otp: { email: string; reason?: string };
  Player: { podId: string };
  Generating: { podId: string; chapterTitle: string };
  StartPodcast: {
    standardId: string;
    sectionId: string;
    chapterId: string;
    chapterTitle: string;
  };
  RaiseHand: { podId: string };
};
