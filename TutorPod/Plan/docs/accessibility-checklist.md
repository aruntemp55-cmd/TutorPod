# Accessibility checklist — Tutor Pod (Sprint 5 / T053)

Spot-check on iOS VoiceOver and Android TalkBack before store submission.

## Global
- [x] Interactive controls expose `accessibilityRole="button"` (PrimaryButton, pills, chips)
- [x] Primary actions have visible text labels (not icon-only without label)
- [x] Decorative waveform marked `accessible={false}` / hidden from a11y tree
- [x] Offline banner uses `accessibilityRole="alert"`
- [ ] Reduce motion: confirm splash/onboarding OK with Reduce Motion on (manual)
- [ ] Dynamic Type / font scaling: spot-check Home + Player (manual)

## Auth
- [x] Login email field `accessibilityLabel="Email"`
- [x] OTP field `accessibilityLabel="One-time code"`
- [x] Soft-prompt Sign in / Not now are labeled buttons
- [ ] Focus order Login → Continue → OTP (manual)

## Home / catalog
- [x] Filter pills All / MyPods / Learning Path have accessibility labels
- [x] Dropdowns expose accessibilityLabel = Standard / Section / Chapter
- [x] Chapter play control labeled `Play {title}`
- [ ] Confirm tab bar announces Home / MyPods / Account (manual)

## Player / raise-hand
- [x] Raise hand control `accessibilityLabel="Raise hand"`
- [x] Transport: ±10 and play/pause are pressable with text glyphs
- [x] Ask sheet title + Resume listening / Close without resuming labeled
- [x] AskTutorComposer: Dictate, Start voice input, Send question, Cancel recording, Stop recording
- [ ] Seek bar: announce position/duration (manual enhancement if needed)

## Contrast / theme notes
- Dark canvas `#121316` with light text — primary CTAs use high-contrast light/accent buttons
- Error banner uses dedicated error color on dark surface
- Avoid conveying status by color alone (pod status also shown as text in PodRow)

## Manual device pass (pre-release)
| Device | VO / TB | Result | Date |
|---|---|---|---|
| iOS Simulator | VoiceOver | _pending_ | |
| Android Emulator | TalkBack | _pending_ | |
