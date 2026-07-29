/**
 * Apoio aos testes de integração.
 *
 * Estes testes correm contra um Postgres a sério, não contra mocks. É
 * deliberado: as garantias mais importantes deste sistema — a constraint que
 * impede marcações geograficamente impossíveis, a imutabilidade do AuditLog,
 * o stock que não fica negativo — vivem na base de dados. Um mock diria que
 * tudo passa e não provaria nada.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { Actor } from "@/server/permissions";

const connectionString = process.env.DATABASE_URL;

export const hasDatabase = Boolean(connectionString);

export const db = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : (null as unknown as PrismaClient);

export interface Fixture {
  unitId: string;
  ownerUserId: string;
  professionalId: string;
  otherProfessionalId: string;
  clientId: string;
  serviceId: string;
  owner: Actor;
  professional: Actor;
}

/**
 * Cria um conjunto de dados isolado para um teste.
 *
 * Cada chamada cria a sua própria unidade. Assim os testes não interferem uns
 * com os outros nem com os dados de demonstração, e podem correr em qualquer
 * ordem.
 */
export async function createFixture(suffix: string): Promise<Fixture> {
  const unit = await db.unit.create({
    data: { name: `Teste ${suffix}`, slug: `teste-${suffix}-${Date.now()}` },
  });

  const [ownerUser, profUser, otherUser] = await Promise.all([
    db.user.create({
      data: { email: `owner-${suffix}-${Date.now()}@teste.pt`, name: "Dona" },
    }),
    db.user.create({
      data: { email: `prof-${suffix}-${Date.now()}@teste.pt`, name: "Profissional" },
    }),
    db.user.create({
      data: { email: `outra-${suffix}-${Date.now()}@teste.pt`, name: "Outra" },
    }),
  ]);

  await Promise.all([
    db.userUnit.create({
      data: { userId: ownerUser.id, unitId: unit.id, role: "OWNER" },
    }),
    db.userUnit.create({
      data: { userId: profUser.id, unitId: unit.id, role: "PROFESSIONAL" },
    }),
  ]);

  const [professional, otherProfessional] = await Promise.all([
    db.professional.create({
      data: { userId: profUser.id, unitId: unit.id, displayName: "Profissional" },
    }),
    db.professional.create({
      data: { userId: otherUser.id, unitId: unit.id, displayName: "Outra" },
    }),
  ]);

  // Segunda a sábado, 9h–19h — igual ao horário real da equipa.
  await db.workingHour.createMany({
    data: [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
      { professionalId: professional.id, weekday, startMin: 540, endMin: 1140 },
      {
        professionalId: otherProfessional.id,
        weekday,
        startMin: 540,
        endMin: 1140,
      },
    ]),
  });

  const zone = await db.travelZone.create({
    data: {
      unitId: unit.id,
      name: "Zona de teste",
      feeCents: 500,
      estimatedMin: 20,
      postalPrefixes: ["1500"],
    },
  });

  const category = await db.serviceCategory.create({
    data: { unitId: unit.id, name: "Cílios", slug: `cilios-${Date.now()}` },
  });

  const service = await db.service.create({
    data: {
      unitId: unit.id,
      categoryId: category.id,
      name: "Volume Russo",
      slug: `volume-russo-${Date.now()}`,
      durationMin: 120,
      setupMin: 15,
      teardownMin: 5,
      priceCents: 3000,
    },
  });

  await db.professionalSkill.createMany({
    data: [
      { professionalId: professional.id, serviceId: service.id },
      { professionalId: otherProfessional.id, serviceId: service.id },
    ],
  });

  const client = await db.client.create({
    data: {
      unitId: unit.id,
      firstName: "Marta",
      lastName: "Silva",
      phone: `+3519${String(Date.now()).slice(-8)}`,
      travelZoneId: zone.id,
      ownerProfessionalId: professional.id,
      status: "ACTIVE",
    },
  });

  return {
    unitId: unit.id,
    ownerUserId: ownerUser.id,
    professionalId: professional.id,
    otherProfessionalId: otherProfessional.id,
    clientId: client.id,
    serviceId: service.id,
    owner: {
      userId: ownerUser.id,
      unitId: unit.id,
      role: "OWNER",
      professionalId: null,
      grants: [],
      revokes: [],
    },
    professional: {
      userId: profUser.id,
      unitId: unit.id,
      role: "PROFESSIONAL",
      professionalId: professional.id,
      grants: [],
      revokes: [],
    },
  };
}

/** Remove tudo o que a fixture criou, pela ordem que as chaves estrangeiras permitem. */
export async function cleanupFixture(unitId: string): Promise<void> {
  // O `AuditLog` é append-only por trigger — apagar está proibido, e é assim
  // que tem de ser em produção. Nos testes desligamos o trigger só o tempo de
  // limpar, senão cada execução deixaria lixo acumulado na base.
  await db.$executeRawUnsafe(
    `ALTER TABLE "AuditLog" DISABLE TRIGGER trg_audit_no_delete`,
  );
  try {
    await db.$executeRawUnsafe(
      `DELETE FROM "AuditLog" WHERE "unitId" = $1`,
      unitId,
    );
  } finally {
    await db.$executeRawUnsafe(
      `ALTER TABLE "AuditLog" ENABLE TRIGGER trg_audit_no_delete`,
    );
  }

  await db.timelineEvent.deleteMany({ where: { unitId } });
  await db.stockMovement.deleteMany({ where: { unitId } });

  // Fidelidade antes das marcações: os carimbos apontam para atendimentos.
  await db.loyaltyStamp.deleteMany({
    where: { card: { client: { unitId } } },
  });
  await db.loyaltyCard.deleteMany({ where: { client: { unitId } } });
  await db.loyaltyProgram.deleteMany({ where: { unitId } });

  await db.appointment.deleteMany({ where: { unitId } });
  await db.client.deleteMany({ where: { unitId } });
  await db.service.deleteMany({ where: { unitId } });
  await db.serviceCategory.deleteMany({ where: { unitId } });
  await db.travelZone.deleteMany({ where: { unitId } });
  await db.workingHour.deleteMany({
    where: { professional: { unitId } },
  });
  await db.professional.deleteMany({ where: { unitId } });
  await db.userUnit.deleteMany({ where: { unitId } });
  await db.unit.delete({ where: { id: unitId } });
}

/** Data futura numa quarta-feira às 10:00 UTC — sempre dentro do horário. */
export function nextWednesdayAt(hour: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7);
  while (date.getUTCDay() !== 3) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}
