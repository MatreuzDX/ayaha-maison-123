import { beforeEach, describe, expect, it } from "vitest";
import {
  buildGoogleAuthUrl,
  signPendingSignup,
  verifyPendingSignup,
} from "@/lib/google-oauth";

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
});

describe("buildGoogleAuthUrl", () => {
  it("inclui o client_id, o redirect_uri certo e o state", () => {
    const url = new URL(buildGoogleAuthUrl("https://ayaha-crm.vercel.app", "abc123"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe(
      "test-client-id.apps.googleusercontent.com",
    );
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://ayaha-crm.vercel.app/api/auth/callback/google",
    );
    expect(url.searchParams.get("state")).toBe("abc123");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });
});

describe("signPendingSignup / verifyPendingSignup", () => {
  const payload = {
    googleId: "google-sub-123",
    email: "cliente@example.com",
    firstName: "Ana",
    lastName: "Silva",
  };

  it("verifica com sucesso um token que acabou de assinar", () => {
    const token = signPendingSignup(payload);
    expect(verifyPendingSignup(token)).toEqual(payload);
  });

  it("rejeita um token com o payload alterado (troca de googleId)", () => {
    const token = signPendingSignup(payload);
    const [json, sig] = token.split(".");
    const tampered = Buffer.from(
      JSON.stringify({ ...payload, googleId: "outro-google-id" }),
    ).toString("base64url");
    expect(verifyPendingSignup(`${tampered}.${sig}`)).toBeNull();
    void json;
  });

  it("rejeita um token com assinatura inválida", () => {
    const token = signPendingSignup(payload);
    const [json] = token.split(".");
    expect(verifyPendingSignup(`${json}.assinatura-falsa`)).toBeNull();
  });

  it("rejeita lixo sem o formato esperado", () => {
    expect(verifyPendingSignup("")).toBeNull();
    expect(verifyPendingSignup("sem-ponto")).toBeNull();
  });
});
