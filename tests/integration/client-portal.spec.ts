import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateOwnProfile } from "@/server/client-portal";
import { ConflictError, ValidationError } from "@/server/errors";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
  type Fixture,
} from "./setup";

/**
 * A cliente edita a própria ficha em `/conta/perfil`. Duas garantias que
 * importam: grava mesmo o que ela escreveu, e não deixa mexer no que é da
 * equipa gerir (estado, notas internas, profissional responsável).
 */
describe.skipIf(!hasDatabase)("perfil da cliente", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("perfil-cliente");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  it("grava contacto, morada e notas de acesso", async () => {
    const updated = await updateOwnProfile(f.clientId, f.unitId, {
      firstName: "Marta",
      lastName: "Silva",
      phone: "933 111 222",
      addressLine: "Rua das Flores, 12",
      addressExtra: "3.º Dto",
      postalCode: "1500-123",
      city: "Lisboa",
      accessNotes: "Campainha 3B",
      parkingNotes: "Lugar na rua de trás",
    });

    expect(updated.addressLine).toBe("Rua das Flores, 12");
    expect(updated.postalCode).toBe("1500-123");
    expect(updated.accessNotes).toBe("Campainha 3B");
    // O telefone é normalizado para E.164, não guardado como foi escrito.
    expect(updated.phone).toBe("+351933111222");

    // Confirma que ficou mesmo na base, não só no objeto devolvido.
    const reloaded = await db.client.findUniqueOrThrow({
      where: { id: f.clientId },
    });
    expect(reloaded.addressLine).toBe("Rua das Flores, 12");
  });

  it("recusa telefone inválido", async () => {
    await expect(
      updateOwnProfile(f.clientId, f.unitId, {
        firstName: "Marta",
        phone: "não é telefone",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("recusa código postal inválido", async () => {
    await expect(
      updateOwnProfile(f.clientId, f.unitId, {
        firstName: "Marta",
        phone: "933 111 222",
        postalCode: "12345",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("recusa primeiro nome vazio", async () => {
    await expect(
      updateOwnProfile(f.clientId, f.unitId, {
        firstName: "   ",
        phone: "933 111 222",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("recusa telefone já usado por outra ficha", async () => {
    const outra = await db.client.create({
      data: {
        unitId: f.unitId,
        firstName: "Outra",
        phone: `+3519${String(Date.now()).slice(-8)}`,
        status: "LEAD",
      },
    });

    await expect(
      updateOwnProfile(f.clientId, f.unitId, {
        firstName: "Marta",
        phone: outra.phone,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("não deixa a cliente mexer no que é da equipa", async () => {
    const antes = await db.client.findUniqueOrThrow({
      where: { id: f.clientId },
    });

    await updateOwnProfile(f.clientId, f.unitId, {
      firstName: "Marta",
      phone: "933 111 222",
      // Campos de equipa passados à socapa — têm de ser ignorados.
      ...({
        status: "BLOCKED",
        notes: "nota interna forjada",
        ownerProfessionalId: null,
        isVip: true,
      } as Record<string, unknown>),
    });

    const depois = await db.client.findUniqueOrThrow({
      where: { id: f.clientId },
    });
    expect(depois.status).toBe(antes.status);
    expect(depois.notes).toBe(antes.notes);
    expect(depois.ownerProfessionalId).toBe(antes.ownerProfessionalId);
    expect(depois.isVip).toBe(antes.isVip);
  });
});
