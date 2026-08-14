import { describe, expectTypeOf, it } from "vitest";
import type {
  AuthProvider,
  ForgotPasswordSubmit,
  LoginSubmit,
  SignUpSubmit,
} from "../../src/components/auth-types";

describe("auth public API (type lock)", () => {
  it("locks AuthProvider", () => {
    expectTypeOf<AuthProvider>().toEqualTypeOf<{
      id: string;
      label: string;
      icon?: string;
    }>();
  });

  it("locks submit payloads", () => {
    expectTypeOf<LoginSubmit>().toEqualTypeOf<{
      identifier: string;
      password: string;
      remember: boolean;
    }>();
    expectTypeOf<SignUpSubmit>().toEqualTypeOf<{
      name: string;
      email: string;
      password: string;
      terms: boolean;
    }>();
    expectTypeOf<ForgotPasswordSubmit>().toEqualTypeOf<{
      email: string;
    }>();
  });
});
