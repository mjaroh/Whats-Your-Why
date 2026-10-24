# Getting Askesis into the App Store

The iPhone app lives in the `ios/` folder. It's a native shell (built with
Capacitor) that opens **whatsyourwhy.app** full screen with the Askesis icon and
a black launch screen. Anything merged to the website shows up in the app
automatically. You only resubmit to Apple when the shell itself changes (icon,
permissions, app version).

Native extras that make it more than a website (Apple guideline 4.2):

- Morning and evening reminders on the habit tracker (iPhone notifications).
- Home Screen and Lock Screen widgets for checking off must dos (iOS 17 or later).
- Camera and photo library access for training videos and profile photos.
- An offline screen if there's no internet.

---

## 1. One-time setup

1. **Join the Apple Developer Program** at <https://developer.apple.com/programs/enroll/> ($99 a year).
   - To list it under a company name, enroll as an organization. That needs a free D-U-N-S number, which takes about a week.
2. **Install Xcode** from the Mac App Store. It's large and takes a while.
3. **Install Node.js** (the LTS version) from <https://nodejs.org>.
4. **Get the code onto your Mac.** Open the **Terminal** app and paste:

   ```sh
   git clone https://github.com/mjaroh/Whats-Your-Why.git
   cd Whats-Your-Why
   npm install
   npx cap sync ios
   npx cap open ios
   ```

   The last line opens the project in Xcode.

## 2. In Xcode

1. In the left sidebar click **App** (the blue icon at the top), then the **App** target, then **Signing & Capabilities**.
2. Tick **Automatically manage signing** and pick your **Team** (your developer account).
3. The **Bundle Identifier** is `app.whatsyourwhy.askesis`. Leave it, or change it if Apple says it's taken.
   - If you change it, change the widget's too (next step) so it still starts with the app's.
4. **Set up the widget target.** In the same list of targets, click **AskesisWidgetExtension** → **Signing & Capabilities**.
   - Tick **Automatically manage signing** and pick the same **Team**. Its Bundle Identifier is `app.whatsyourwhy.askesis.widget`.
   - Check that both **App** and **AskesisWidgetExtension** show **App Groups** with `group.app.whatsyourwhy.askesis` ticked. This is how the app hands the widget its key.
   - If App Groups is missing or red on either one: click **+ Capability**, add **App Groups**, click **+**, type `group.app.whatsyourwhy.askesis`, and tick it.
5. **Try it on your iPhone.**
   - Plug your phone in and choose it at the top of the window.
   - Press the ▶ button.
   - The first time, your iPhone asks you to trust the developer: go to Settings → General → VPN & Device Management.
6. **Try the widgets.**
   - In the app, open the Habit tracker, scroll down to **Widgets**, and tap **Turn on widgets**.
   - Follow the steps shown there to add one to your Home Screen and your Lock Screen.
   - Tap a must do on the widget, then open the app: it should be checked there too.
7. **Upload it to Apple.**
   - At the top, set the device to **Any iOS Device (arm64)**.
   - Choose **Product → Archive**.
   - When the Organizer window opens, click **Distribute App → App Store Connect → Upload**.

For later uploads, raise the **Build** number by 1 each time (App target → General → Identity). Raise the **Version** (1.0 → 1.1) for releases people will notice.

Change the **AskesisWidgetExtension** target's Version and Build to match every time. Apple rejects uploads where they differ.

## 3. In App Store Connect

Go to <https://appstoreconnect.apple.com> → **My Apps** → **+** → **New App**.

| Field | Value |
|---|---|
| Platform | iOS |
| Name | **Askesis - What's your why?** |
| Primary language | English (U.S.) |
| Bundle ID | app.whatsyourwhy.askesis |
| SKU | askesis-ios |

### App information

- **Subtitle (30 characters max):** Purpose-driven athlete coaching
- **Category:** Health & Fitness (secondary: Sports)
- **Privacy Policy URL:** https://whatsyourwhy.app/privacy
- **Terms of Use (EULA):** https://whatsyourwhy.app/terms. Put this link in the app description too.
- **Support URL:** https://whatsyourwhy.app
- **Age rating:** answer the questionnaire honestly. The things to declare are:
  - users can chat in the group, and it's moderated;
  - user-generated content (videos and photos);
  - general wellness and nutrition guidance, not medical.

  Expect a rating around **13+**.

### Description

```
Every great athlete has a reason. Askesis helps you find yours.

FIND YOUR WHY
Answer seven questions. Each one goes deeper, until you reach the purpose underneath your goal. You walk away with a purpose statement in your own words.

YOUR OWN COACH
A private AI coach that teaches in the voice of Michael Jaroh, an elite gymnast training for LA 2028. It knows your why, your sport and your habits, checks in with you every day, and gives feedback on your training videos.

THE GROUP
Train alongside athletes who know their why. A daily group check-in, moderated for safety, with video sharing.

HABIT TRACKER
Set your own must do, want to do and wish to do habits. Log your sleep. See your month at a glance and your total progress since day one. Check off your must dos right from your Home Screen or Lock Screen with widgets.

COUNT DOWN TO WHAT MATTERS
Set your big day — a meet, tryouts, your first game — and watch it come closer. Olympic-sport athletes also get a live countdown to LA 2028.

The group and habit tracker are free. The private coach is a membership: $14.99/month or $120/year.

Askesis is for athletes 13 and older. The coach is an AI and is not medical advice. Michael is an Eastern Orthodox Christian; the coach only talks about faith if you ask (apart from one encouraging verse, Proverbs 24:16, if you miss a must do habit for a week), and then answers from the Orthodox perspective.
Terms: https://whatsyourwhy.app/terms
Privacy: https://whatsyourwhy.app/privacy
```

- **Promotional text:** Find your why in seven questions, then train with a coach who knows it.
- **Keywords (100 characters max):** athlete,motivation,purpose,coach,habit tracker,gymnastics,mindset,training,sports,goals
- **Screenshots:** take them on your iPhone (side button + volume up) on these screens: the Seven Whys, the purpose statement, Group, Coach, the Habit tracker, and the Profile with countdowns. Apple needs 6.7" or 6.9" iPhone screenshots. If you have a Pro Max, use it; otherwise use Xcode's iPhone 16 Pro Max simulator.

### App Privacy ("nutrition label")

Declare these as **collected, linked to the user, not used for tracking**:

| Data | Used for |
|---|---|
| Contact info: email address, name | App functionality (sign-in) |
| User content: photos or videos, customer support, other user content (chat messages, habits, why statement) | App functionality |
| Health & fitness: fitness (habit and sleep log) | App functionality |
| Identifiers: user ID | App functionality |
| Purchases: purchase history | App functionality (membership) |

No tracking, no ads, no data sold.

### Pricing and availability

- **Price:** Free. The membership is sold on your website through Stripe.
- **Availability:** start with the **United States** only.
  - Since a 2025 court ruling, US apps are allowed to send people to their own website to pay, with no Apple fee. In other countries Apple still requires its own in-app purchase system.
  - Apple's rules change often, so re-check this before you submit: <https://developer.apple.com/app-store/review/guidelines/#3.1.1>

### App Review information

- **Sign-in required:** yes. Create a test account for Apple and give them its email and password. Make it a member: subscribe it once yourself, or grant it access in Stripe, so the reviewer can see the coach.
- **Notes for the reviewer:**

  ```
  Askesis helps teen athletes (13+) find their purpose and build habits.
  - Account deletion: Profile → ••• menu → Delete account.
  - Widgets: Profile → Habit tracker → scroll to Widgets → Turn on widgets, then add the "Must dos" widget to the Home Screen or Lock Screen.
  - Membership is purchased on our website via Stripe (US storefront, external purchase link).
  - Group chat is moderated: messages are screened automatically before posting, users can report messages, and admins can remove content and ban users. Videos are approved by an admin before others see them.
  - The coach is an AI; it shows crisis resources (988, Crisis Text Line) if a message suggests someone may be in danger.
  ```

Then click **Add for Review → Submit**. Reviews usually take 1–3 days. If Apple rejects it, paste their message to me and I'll fix it.

---

## Before you submit — checklist

- [ ] Clerk is set to **email** sign-in (email code or password). Google sign-in doesn't work inside apps. If you offer Google or other social logins, Apple also requires **Sign in with Apple**.
- [ ] Clerk is on its **production** instance (your own domain), not the development one.
- [ ] Stripe is in **live mode**, with the webhook pointing at https://whatsyourwhy.app/api/billing/webhook.
- [ ] The support email on the Privacy and Terms pages works. It defaults to support@whatsyourwhy.app; set `NEXT_PUBLIC_CONTACT_EMAIL` in Vercel to change it.
- [ ] Have a lawyer look over the Privacy Policy and Terms. They're written from what the app actually does, but they're a starting point, not legal advice.
