import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      masterKey: string;
      masterKeySalt: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    masterKey?: string;
    masterKeySalt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    email: string;
    name?: string | null;
    masterKey?: string;
    masterKeySalt?: string;
  }
}
