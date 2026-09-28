// Membership (sign-in, paywall, coach) switches on once Clerk's keys are set.
// Until then the free Seven Whys and the waitlist keep working as before.
export const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);
