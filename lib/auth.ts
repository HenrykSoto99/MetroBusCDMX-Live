import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getPool } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { consumeRateLimit } from "@/lib/rate-limit";
import { credentialsSchema } from "@/lib/validation";
import type { RowDataPacket } from "mysql2";

const useSecureCookies = process.env.AUTH_COOKIE_SECURE !== "false";
const cookieSameSite = useSecureCookies ? "none" : "lax";
const secureCookiePrefix = useSecureCookies ? "__Host-" : "";

type UserRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
  password_hash: string;
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  cookies: {
    sessionToken: {
      name: "metrobus_session",
      options: {
        httpOnly: true,
        sameSite: cookieSameSite,
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${secureCookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: cookieSameSite,
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${secureCookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: cookieSameSite,
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Correo y contraseña",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) throw new Error("Correo y contraseña no válidos.");

        const { email, password } = parsed.data;
        const allowed = await consumeRateLimit(`login:${email}`);
        if (!allowed) throw new Error("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");

        const [rows] = await getPool().execute<UserRow[]>(
          "SELECT id, name, email, password_hash FROM metrobus_users WHERE email = ? LIMIT 1",
          [email],
        );
        const user = rows[0];
        if (!user || !(await verifyPassword(password, user.password_hash))) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id;
      return session;
    },
    async redirect() {
      return "/app";
    },
  },
};
