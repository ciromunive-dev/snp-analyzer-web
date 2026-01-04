import NextAuth from "next-auth";
import { cache } from "react";
import type { Session } from "next-auth";

import { authConfig, DEMO_SESSION } from "./config";

const { handlers, signIn, signOut } = NextAuth(authConfig);

// Demo mode: always return demo session
const auth = cache(async (): Promise<Session> => {
  return DEMO_SESSION as Session;
});

export { auth, handlers, signIn, signOut };
