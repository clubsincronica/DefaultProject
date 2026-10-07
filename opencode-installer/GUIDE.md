# opencode Windows Installer — Click-by-Click Picture Guide

No typing. No black windows. Just clicks.

This guide matches the installer window buttons exactly:
Browse... → Install → Test → Get free keys.

The installer never asks for keys and never stores keys.
Keys live only on the provider websites and in Windows Settings.
Nothing secret is ever pasted into the installer.

---

## Step 1 — Open the installer (1 double-click)

1. Find the file named OpenCode-Setup.exe (usually in Downloads).
2. Double-click OpenCode-Setup.exe.
3. The installer window opens. Its title reads "opencode Windows Installer".

If Windows shows a blue "Windows protected your PC" screen:

1. Click the words "More info".
2. Click the button "Run anyway".

That blue screen is normal for a new file from the internet.
The installer window appears right after you click "Run anyway".

> Screenshot slot 1 — placeholder the USER fills:
> Save your own Snipping Tool capture as docs/wizard-start.png
> (the installer window as it first opens).
> This file does not exist yet — you create it. Not a code placeholder.

---

## Step 2 — Pick a folder, then click Install (3 clicks)

1. Look at the line labeled "Project folder:".
2. Click the button labeled "Browse...".
3. In the folder picker that opens, click the folder you want, then click OK.
   (Tip: make one empty folder first, for example Documents with a name like
   opencode-project, and pick that empty folder.)
4. Back in the installer window, click the button labeled "Install".
5. Watch the bar fill up and lines appear in the big white box.
6. Wait until a green line appears saying everything is done and telling you
   to click Test next.

> Screenshot slot 2 — placeholder the USER fills:
> Save your own Snipping Tool capture as docs/pick-folder.png
> (the folder picker open on top of the installer window).
> This file does not exist yet — you create it. Not a code placeholder.

> Screenshot slot 3 — placeholder the USER fills:
> Save your own Snipping Tool capture as docs/install-done.png
> (the installer window with the bar full and the green done line visible).
> This file does not exist yet — you create it. Not a code placeholder.

If a red line appears instead, read it in plain language:

- a red line about the network means: check your internet, then click Install again.
- a red line about missing tools means: install Node.js LTS first
  (from its normal website download button), then click Install again.

---

## Step 3 — Get the free keys (browser clicks only, nothing pasted here)

The installer has a button labeled "Get free keys".
Clicking it opens two web pages for you. You copy each key from its page
and you paste each key into Windows Settings — never into the installer.

Key page 1 — OpenRouter (free models key):

1. Click the "Get free keys" button in the installer.
2. Your browser opens https://openrouter.ai/keys
3. On that page, click Sign in (make a free account if asked).
4. Click Create Key.
5. Click Copy (the key stays on that website — do not paste it into the installer).

Key page 2 — NVIDIA (backup models key, starts with nvapi-):

1. In your browser, go to the second page that opened: https://build.nvidia.com/
2. On that page, sign in with a free account.
3. Find the Generate key control and click it.
4. Click Copy on the key that starts with nvapi-
   (that key stays on that website — do not paste it into the installer).

Where the keys DO go — Windows Settings, by clicks:

1. Click Start.
2. Click Settings (the gear picture).
3. In the left list, click System.
4. Click About.
5. Click Advanced system settings.
6. In the little window that opens, click the button labeled
   Environment Variables at the bottom.
7. Under the top list, click New.
8. Make the first entry with name OMNIROUTE_API_KEY and paste the OpenRouter
   key as its value, then click OK.
9. Click New again.
10. Make the second entry with name NVIDIA_API_KEY and paste the NVIDIA
    key (the one starting with nvapi-) as its value, then click OK.
11. Click OK on every window to close them.

Done. The installer file itself holds zero key material — that is on purpose.

---

## Step 4 — Click Test and look for green lines (1 click)

1. Close all the Settings windows so only the installer window is visible.
2. Click the button labeled "Test".
3. Watch the big white box in the installer window.

What good looks like:

- a green line showing the installed app version number.
- a second green line saying the saved settings check passed.

What bad looks like:

- a red line means that check did not pass — read its plain words,
  fix what it names, then click Test again.

When both lines are green, you are finished. Close the installer window
with the X in the top corner and start using opencode on your project folder.
