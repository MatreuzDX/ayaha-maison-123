import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getClient,
  revokeClientAccountAccess,
  setClientAccountPassword,
  updateClientAccountEmail,
} from "@/server/services/client.service";
import { ConflictError, ValidationError } from "@/server/errors";
import { verifyPassword } from "@/server/auth";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
  type Fixture,
} from "./setup";

/**
 * Gestão do acesso da cliente ao portal, feita pela equipa.
 *
 * A garantia que interessa: a equipa consegue devolver o acesso a quem o
 * perdeu, mas nunca consegue ler a palavra-passe de ninguém.
 */
describe.skipIf(!hasDatabase)("gestão do acesso ao portal", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("gestao-acesso");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  async function novaConta(sufixo: string) {
    await db.clientAccount.deleteMany({ where: { clientId: f.clientId } });
    return db.clientAccount.create({
      data: {
        clientId: f.clientId,
        email: `acesso-${sufixo}-${Date.now()}@teste.pt`,
        passwordHash: "hash-antigo",
        approvedAt: new Date(),
      },
    });
  }

  it("a ficha nunca devolve o hash da palavra-passe", async () => {
    await novaConta("sem-hash");

    const client = await getClient(f.owner, f.clientId);

    expect(client.account).not.toBeNull();
    expect(client.account?.hasPassword).toBe(true);
    // O objeto devolvido não pode ter `passwordHash` de todo — nem sequer
    // vazio. Se aparecesse, bastava um descuido para ir parar ao browser.
    expect(client.account).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(client.account)).not.toContain("hash-antigo");
  });

  it("altera o e-mail de acesso", async () => {
    await novaConta("email");
    const novo = `novo-${Date.now()}@teste.pt`;

    const updated = await updateClientAccountEmail(f.owner, f.clientId, novo);
    expect(updated.email).toBe(novo);
  });

  it("recusa e-mail já usado por outra conta", async () => {
    const conta = await novaConta("duplicado");

    const outroCliente = await db.client.create({
      data: {
        unitId: f.unitId,
        firstName: "Outra",
        phone: `+3519${String(Date.now()).slice(-8)}`,
        status: "LEAD",
      },
    });
    const outraConta = await db.clientAccount.create({
      data: {
        clientId: outroCliente.id,
        email: `ocupado-${Date.now()}@teste.pt`,
        passwordHash: "x",
      },
    });

    await expect(
      updateClientAccountEmail(f.owner, f.clientId, outraConta.email),
    ).rejects.toThrow(ConflictError);

    // A conta original ficou intacta.
    const inalterada = await db.clientAccount.findUniqueOrThrow({
      where: { id: conta.id },
    });
    expect(inalterada.email).toBe(conta.email);
  });

  it("define uma palavra-passe nova, guardada como hash", async () => {
    const conta = await novaConta("password");

    await setClientAccountPassword(f.owner, f.clientId, "palavra-passe-nova");

    const depois = await db.clientAccount.findUniqueOrThrow({
      where: { id: conta.id },
    });
    // Guardada como hash, nunca em claro.
    expect(depois.passwordHash).not.toBeNull();
    expect(depois.passwordHash).not.toContain("palavra-passe-nova");
    // Mas confere com a palavra-passe combinada.
    expect(
      await verifyPassword(depois.passwordHash!, "palavra-passe-nova"),
    ).toBe(true);
  });

  it("recusa palavra-passe demasiado curta", async () => {
    await novaConta("curta");

    await expect(
      setClientAccountPassword(f.owner, f.clientId, "abc"),
    ).rejects.toThrow(ValidationError);
  });

  it("definir palavra-passe nova fecha as sessões abertas", async () => {
    const conta = await novaConta("sessoes");
    await db.clientSession.create({
      data: {
        sessionToken: `token-${Date.now()}`,
        clientAccountId: conta.id,
        expires: new Date(Date.now() + 86_400_000),
      },
    });

    await setClientAccountPassword(f.owner, f.clientId, "outra-palavra-passe");

    const sessoes = await db.clientSession.count({
      where: { clientAccountId: conta.id },
    });
    expect(sessoes).toBe(0);
  });

  it("remover o acesso corta palavra-passe, Google e sessões", async () => {
    await db.clientAccount.deleteMany({ where: { clientId: f.clientId } });
    const conta = await db.clientAccount.create({
      data: {
        clientId: f.clientId,
        email: `revogar-${Date.now()}@teste.pt`,
        passwordHash: "hash",
        googleId: `google-${Date.now()}`,
        approvedAt: new Date(),
      },
    });
    await db.clientSession.create({
      data: {
        sessionToken: `token-revogar-${Date.now()}`,
        clientAccountId: conta.id,
        expires: new Date(Date.now() + 86_400_000),
      },
    });

    await revokeClientAccountAccess(f.owner, f.clientId);

    const depois = await db.clientAccount.findUniqueOrThrow({
      where: { id: conta.id },
    });
    expect(depois.passwordHash).toBeNull();
    expect(depois.googleId).toBeNull();
    // A conta e o e-mail ficam — é reversível.
    expect(depois.email).toBe(conta.email);

    const sessoes = await db.clientSession.count({
      where: { clientAccountId: conta.id },
    });
    expect(sessoes).toBe(0);
  });
});
