declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      isSuperAdmin?: boolean;
      readOnly?: boolean;
      impersonatedByUserId?: string | null;
      impersonatedByEmail?: string | null;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
