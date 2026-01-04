import { type DefaultSession, type NextAuthConfig } from "next-auth";
import { DEMO_USER } from "~/lib/constants";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/**
 * Options for NextAuth.js - minimal config for demo mode
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET ?? "demo-secret-key-for-testing",
  trustHost: true,
  providers: [],
  callbacks: {
    session: ({ session }) => ({
      ...session,
      user: {
        ...session.user,
        id: DEMO_USER.id,
      },
    }),
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
} satisfies NextAuthConfig;
