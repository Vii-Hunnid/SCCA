import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      // Epoch seconds of JWT issuance — used to invalidate sessions
      // issued before the last password change. The master encryption key
      // is deliberately NOT carried in the session; it is derived
      // server-side per request in src/lib/session.ts.
      sessionIssuedAt?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    email: string;
    name?: string | null;
  }
}
