import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { type EmailConfig } from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "./db/schema/user";
import onUserCreate from "./lib/users/onUserCreate";
import sendMail from "./lib/email/sendMail";
import { appConfig } from "./lib/config";
import { decryptJson } from "./lib/encryption/edge-jwt";
import { eq } from "drizzle-orm";
import { checkEmailRateLimit } from "./lib/ratelimit";
import { log } from "./lib/logging";
import {
  isAccountLocked,
  recordFailedAttempt,
  clearLockout,
} from "./lib/auth/lockout";

// Overrides default session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      impersonatedBy?: string;
    };
    expires: string;
  }
}

interface ImpersonateToken {
  impersonateIntoId: string;
  impersonateIntoEmail: string;
  impersonator: string;
  expiry: string;
}

const emailProvider: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  async sendVerificationRequest(params) {
    // SECURITY: Rate limit magic link emails to prevent abuse
    const rateLimitResult = await checkEmailRateLimit(params.identifier);
    if (rateLimitResult) {
      // Rate limit exceeded - log and silently skip sending
      // We don't throw to avoid exposing rate limit info to attackers
      log("warn", "Magic link rate limit exceeded", {
        email: params.identifier.slice(0, 3) + "***", // Partially redact
      });
      // Still return successfully to not reveal rate limiting to user
      // The verification token is created but email not sent
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `Magic link for ${params.identifier}: ${params.url} expires at ${params.expires}`
      );
    }

    // TODO: Re-enable email templates after fixing react-email build issue
    const html = `
      <html>
        <body>
          <h1>Sign in to BlinkFund</h1>
          <p>Click <a href="${params.url}">here</a> to sign in.</p>
          <p>This link expires at ${params.expires.toISOString()}</p>
        </body>
      </html>
    `;

    await sendMail({
      to: params.identifier,
      subject: `Sign in to ${appConfig.projectName}`,
      html,
    });

    log("info", "Magic link email sent", {
      email: params.identifier.slice(0, 3) + "***",
    });
  },
};

const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/sign-in",
    signOut: "/sign-out",
  },
  session: {
    strategy: "jwt",
  },
  adapter: {
    ...adapter,
    createUser: async (user) => {
      if (!adapter.createUser) {
        throw new Error("Adapter is not initialized");
      }
      const newUser = await adapter.createUser(user);
      // Update the user with the default plan
      await onUserCreate(newUser);

      return newUser;
    },
  },
  callbacks: {
    async signIn() {
      return process.env.NEXT_PUBLIC_SIGNIN_ENABLED === "true";
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.email) {
        session.user.email = token.email;
      }
      if (token.impersonatedBy) {
        session.user.impersonatedBy = token.impersonatedBy as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      // If user object is available (after sign in), check if impersonation is happening
      if (user && "impersonatedBy" in user) {
        token.impersonatedBy = user.impersonatedBy;
      }

      // NOTE: Do not add anything else to the token, except for the sub
      // This avoids stale data problems, while increasing db roundtrips
      // which is acceptable while starting small.
      return {
        sub: token.sub,
        email: token.email,
        impersonatedBy: token.impersonatedBy,
        iat: token.iat,
        exp: token.exp,
        jti: token.jti,
      };
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // SECURITY: Removed allowDangerousEmailAccountLinking to prevent account takeover
      // Users must explicitly link accounts through a consent flow
    }),
    emailProvider,
    // Password-based authentication
    ...(appConfig.auth?.enablePasswordAuth
      ? [
          CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
              email: {
                label: "Email",
                type: "email",
                placeholder: "name@example.com",
              },
              password: {
                label: "Password",
                type: "password",
              },
            },
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) {
                return null;
              }

              const email = credentials.email as string;

              try {
                // SECURITY: Check if account is locked due to too many failed attempts
                const lockoutStatus = await isAccountLocked(email);
                if (lockoutStatus.locked) {
                  log("warn", "Login attempt on locked account", {
                    email: email.slice(0, 3) + "***",
                    unlocksAt: lockoutStatus.unlocksAt?.toISOString(),
                  });
                  // Return null to indicate failed auth
                  // The lockout message should be shown via a separate API
                  return null;
                }

                // Find user by email
                const user = await db
                  .select({
                    id: users.id,
                    email: users.email,
                    name: users.name,
                    password: users.password,
                  })
                  .from(users)
                  .where(eq(users.email, email))
                  .limit(1)
                  .then((users) => users[0]);

                if (!user || !user.password) {
                  // Record failed attempt even for non-existent users
                  // This prevents user enumeration attacks
                  await recordFailedAttempt(email);
                  return null;
                }

                const { verifyPassword } = await import("./lib/auth/password");
                // Verify password
                const passwordCorrect = await verifyPassword(
                  credentials.password as string,
                  user.password
                );

                if (!passwordCorrect) {
                  // SECURITY: Record failed attempt
                  const result = await recordFailedAttempt(email);
                  if (result.locked) {
                    log("warn", "Account locked after failed attempt", {
                      email: email.slice(0, 3) + "***",
                    });
                  }
                  return null;
                }

                // SECURITY: Clear lockout on successful login
                await clearLockout(email);

                log("info", "Successful password login", {
                  email: email.slice(0, 3) + "***",
                });

                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                };
              } catch (error) {
                log("error", "Password authentication error", {
                  error: error instanceof Error ? error.name : "Unknown",
                });
                return null;
              }
            },
          }),
        ]
      : []),
    // Impersonation provider (super admin only)
    CredentialsProvider({
      id: "impersonation",
      name: "Impersonation",
      credentials: {
        signedToken: {
          label: "Signed Token",
          type: "text",
          placeholder: "Signed Token",
          required: true,
        },
      },
      async authorize(credentials) {
        if (!credentials?.signedToken) {
          return null;
        }

        try {
          // The token is already URL encoded, decryptJson handles the decoding
          const impersonationToken = await decryptJson<ImpersonateToken>(
            credentials.signedToken as string
          );

          // Validate token expiry
          if (new Date(impersonationToken.expiry) < new Date()) {
            throw new Error("Impersonation token expired");
          }

          // Trust the decrypted token without additional database validations
          return {
            id: impersonationToken.impersonateIntoId,
            email: impersonationToken.impersonateIntoEmail,
            impersonatedBy: impersonationToken.impersonator,
          };
        } catch (error) {
          console.error("Error during impersonation:", error);
          return null;
        }
      },
    }),
    // TIP: Add more providers here as needed like Apple, Facebook, etc.
  ],
});
