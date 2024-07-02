import {PrismaAdapter} from "@next-auth/prisma-adapter";
import {type DefaultSession, type NextAuthOptions} from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import {prisma} from "@pyxl/db";

/**
 * Module augmentation for `next-auth` types
 * Allows us to add custom properties to the `session` object
 * and keep type safety
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 **/
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      access_token: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

const url = (process.env.NEXTAUTH_URL ? process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000' : 'http://localhost:3000')
const useSecureCookies = url.includes('https://')
const cookiePrefix = useSecureCookies ? '__Secure-' : ''
const hostName = new URL(url).hostname
/**
 * Options for NextAuth.js used to configure
 * adapters, providers, callbacks, etc.
 * @see https://next-auth.js.org/configuration/options
 **/
export const authOptions: NextAuthOptions = {
  cookies: {
    sessionToken:
    {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: hostName == 'localhost' ? hostName : '.' + hostName // add a . in front so that subdomains are included
      }
    },
  },
  callbacks: {
    jwt: ({token, user, account}) => {
      return {...token, ...user, access_token: account?.access_token};
    },
    session({session, user, token}) {
      if (session.user) {
        session.user = {...session.user, id: user?.id, access_token: token?.access_token as string};
        // session.user.role = user.role; <-- put other properties on the session here
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    }),
    /**
     * ...add more providers here
     *
     * Most other providers require a bit more work than the Discord provider.
     * For example, the GitHub provider requires you to add the
     * `refresh_token_expires_in` field to the Account model. Refer to the
     * NextAuth.js docs for the provider you want to use. Example:
     * @see https://next-auth.js.org/providers/github
     **/
  ],
};
