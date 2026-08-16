import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listSegments } from "@/server/services/marketing.service";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
  type Fixture,
} from "./setup";

/**
 * Segmentos de marketing.
 *
 * O que interessa provar aqui é sobretudo o que NÃO aparece: quem não deu
 * consentimento fica de fora (é o ponto de RGPD do módulo inteiro), e quem
 * já tem a próxima marcação não precisa de ser recuperada.
 */
describe.skipIf(!hasDatabase)("segmentos de marketing", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("marketing");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  /** Cria uma cliente com o estado exato de que o teste precisa. */
  async function criarCliente(dados: {
    nome: string;
    diasDesdeUltimaVisita?: number;
    visitCount?: number;
    marketingOptIn?: boolean;
    birthDate?: Date;
  }) {
    const { nome, diasDesdeUltimaVisita, visitCount = 1 } = dados;
    return db.client.create({
      data: {
        unitId: f.unitId,
        firstName: nome,
        phone: `+3519${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
        status: "ACTIVE",
        visitCount,
        marketingOptIn: dados.marketingOptIn ?? true,
        birthDate: dados.birthDate ?? null,
        lastVisitAt:
          diasDesdeUltimaVisita === undefined
            ? null
            : new Date(Date.now() - diasDesdeUltimaVisita * 86_400_000),
      },
    });
  }

  function segmento(segments: Awaited<ReturnType<typeof listSegments>>, key: string) {
    const s = segments.find((x) => x.key === key);
    if (!s) throw new Error(`segmento "${key}" não existe`);
    return s;
  }

  it("põe em risco quem está entre 45 e 90 dias sem voltar", async () => {
    const c = await criarCliente({ nome: "EmRisco", diasDesdeUltimaVisita: 60 });

    const s = segmento(await listSegments(f.owner), "em-risco");
    expect(s.clients.find((x) => x.clientId === c.id)).toBeDefined();

    await db.client.delete({ where: { id: c.id } });
  });

  it("põe em adormecidas quem passou dos 90 dias", async () => {
    const c = await criarCliente({
      nome: "Adormecida",
      diasDesdeUltimaVisita: 120,
    });

    const segs = await listSegments(f.owner);
    expect(
      segmento(segs, "adormecidas").clients.find((x) => x.clientId === c.id),
    ).toBeDefined();
    // Não pode estar nos dois ao mesmo tempo.
    expect(
      segmento(segs, "em-risco").clients.find((x) => x.clientId === c.id),
    ).toBeUndefined();

    await db.client.delete({ where: { id: c.id } });
  });

  it("exclui quem não deu consentimento de marketing, e conta-o à parte", async () => {
    const c = await criarCliente({
      nome: "SemConsentimento",
      diasDesdeUltimaVisita: 60,
      marketingOptIn: false,
    });

    const s = segmento(await listSegments(f.owner), "em-risco");
    expect(s.clients.find((x) => x.clientId === c.id)).toBeUndefined();
    expect(s.withoutConsent).toBeGreaterThanOrEqual(1);

    await db.client.delete({ where: { id: c.id } });
  });

  it("não tenta recuperar quem já tem a próxima marcação", async () => {
    const c = await criarCliente({ nome: "JaMarcou", diasDesdeUltimaVisita: 60 });
    const startAt = new Date(Date.now() + 3 * 86_400_000);
    const a = await db.appointment.create({
      data: {
        unitId: f.unitId,
        code: `MKT-${Date.now()}`,
        clientId: c.id,
        professionalId: f.professionalId,
        status: "CONFIRMED",
        startAt,
        endAt: new Date(startAt.getTime() + 90 * 60_000),
        departAt: startAt,
      },
    });

    const s = segmento(await listSegments(f.owner), "em-risco");
    expect(s.clients.find((x) => x.clientId === c.id)).toBeUndefined();

    await db.appointment.delete({ where: { id: a.id } });
    await db.client.delete({ where: { id: c.id } });
  });

  it("apanha aniversariantes do mês corrente e ignora os outros meses", async () => {
    const hoje = new Date();
    const esteMes = new Date(1995, hoje.getMonth(), 15);
    const outroMes = new Date(1995, (hoje.getMonth() + 6) % 12, 15);

    const aniversariante = await criarCliente({
      nome: "FazAnos",
      diasDesdeUltimaVisita: 10,
      birthDate: esteMes,
    });
    const outro = await criarCliente({
      nome: "NaoFazAnos",
      diasDesdeUltimaVisita: 10,
      birthDate: outroMes,
    });

    const s = segmento(await listSegments(f.owner), "aniversariantes");
    expect(
      s.clients.find((x) => x.clientId === aniversariante.id),
    ).toBeDefined();
    expect(s.clients.find((x) => x.clientId === outro.id)).toBeUndefined();

    await db.client.deleteMany({
      where: { id: { in: [aniversariante.id, outro.id] } },
    });
  });

  it("apanha quem veio só uma vez e ainda não voltou", async () => {
    const uma = await criarCliente({
      nome: "SoUmaVez",
      diasDesdeUltimaVisita: 30,
      visitCount: 1,
    });
    const varias = await criarCliente({
      nome: "VariasVezes",
      diasDesdeUltimaVisita: 30,
      visitCount: 5,
    });

    const s = segmento(await listSegments(f.owner), "primeira-visita");
    expect(s.clients.find((x) => x.clientId === uma.id)).toBeDefined();
    expect(s.clients.find((x) => x.clientId === varias.id)).toBeUndefined();

    await db.client.deleteMany({ where: { id: { in: [uma.id, varias.id] } } });
  });

  it("devolve lista vazia a quem não tem permissão de marketing", async () => {
    // FINANCE é um papel real da casa que trata de faturação e não tem
    // `marketing:read` — não deve ver a lista de contactos das clientes.
    const contabilidade = { ...f.owner, role: "FINANCE" as const };
    expect(await listSegments(contabilidade)).toEqual([]);
  });
});
