# Attentive Brave

Attentive Brave adds a mandatory sight-pump overlay to Brave desktop pages.
Sight starts at 100%, drains continuously by 0.35 percentage points every 100
ms, and gains 3 points after each completed pump stroke.

## Behavior

- A compact, non-blocking HUD at the bottom-right contains an animated SVG eye,
  percentage badge, physical T-bar pump, and stroke-pressure indicator.
- A stroke counts only after the T-bar is dragged fully down and released.
  Strokes have a 150 ms cooldown and sight is capped at 180%.
- Below 100%, the page darkens with `1 - sight / 100` opacity.
- Below 40%, blur rises progressively to 16 px at 0%.
- At 0%, the website viewport is silently black and blocked. The percentage is
  hidden, leaving only the eye and pump.
- Above 100%, the page turns progressively white, reaching full glare and 12 px
  blur at 180%.
- Overpressure contracts the pupil, reveals orange and yellow eye veins, and
  increases eye vibration with pressure.
- Successful strokes send animated air particles from the pump to the eye.
- Sight state is shared across tabs and survives navigation and browser
  restarts.

The mechanics are defined at the top of
`components/brave_extension/extension/brave_extension/attentive.ts`.

## Why there is no web proxy

This is a real browser source fork, so websites load directly in Chromium's
normal renderer. An Express iframe proxy is unnecessary and would break origin
security, cookies, authentication, downloads, and many modern applications.
Removing `Content-Security-Policy` or `X-Frame-Options` is deliberately not part
of Attentive Brave.

## Build

This repository is `brave-core`, the source component used by the
`brave-browser` build wrapper. Follow Brave's current Windows build guide, then
replace the checked-out `src/brave` directory with this repository or point its
remote at this fork before building a Release target.

The overlay is bundled into Brave's existing component extension by:

- compiling `attentive.ts` as `out/attentive.bundle.js`;
- declaring it as a document-start content script for `<all_urls>`; and
- using the existing bundled extension storage permission for cross-tab state.

Chromium security rules do not allow extension content scripts to run on
browser-internal pages such as `brave://settings` or the browser toolbar. The
overlay covers the website viewport, not Brave's native title bar or address
bar.
