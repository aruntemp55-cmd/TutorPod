import { kvGet, kvSet } from "./kvStore";

const KEY = "tutorpod.onboardingDone";

export default {
  async isOnboardingDone() {
    return (await kvGet(KEY)) === "1";
  },
  async setOnboardingDone() {
    await kvSet(KEY, "1");
  },
};
