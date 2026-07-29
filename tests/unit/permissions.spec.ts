import { describe, expect, it } from "vitest";
import {
  type Actor,
  type Permission,
  appointmentScope,
  assertCan,
  assertOwns,
  can,
  canAll,
  clientScope,
  commissionScope,
  professionalScope,
  scopeOf,
} from "@/server/permissions";
import { ForbiddenError } from "@/server/errors";

const UNIT = "unit_benfica";

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    userId: "u1",
    unitId: UNIT,
    role: "OWNER",
    professionalId: null,
    grants: [],
    revokes: [],
    ...overrides,
  };
}

const owner = actor({ role: "OWNER", userId: "u_owner" });
const manager = actor({ role: "MANAGER", userId: "u_manager" });
const sofia = actor({
  role: "PROFESSIONAL",
  userId: "u_sofia",
  professionalId: "prof_sofia",
});
const ines = actor({
  role: "PROFESSIONAL",
  userId: "u_ines",
  professionalId: "prof_ines",
});
const reception = actor({ role: "RECEPTIONIST", userId: "u_recep" });
const finance = actor({ role: "FINANCE", userId: "u_fin" });
const readonly = actor({ role: "READONLY", userId: "u_ro" });

describe("matriz de papéis", () => {
  it("a proprietária pode tudo o que importa", () => {
    const critical: Permission[] = [
      "client:delete",
      "commission:approve",
      "audit:read",
      "gdpr:handle",
      "settings:write",
      "user:manage",
      "appointment:override_conflict",
    ];
    for (const p of critical) expect(canAll(owner, p)).toBe(true);
  });

  it("a gestora não aprova comissões nem lê auditoria", () => {
    // Dinheiro que sai e rasto de auditoria ficam só com a proprietária.
    expect(can(manager, "commission:approve")).toBe(false);
    expect(can(manager, "audit:read")).toBe(false);
    expect(can(manager, "gdpr:handle")).toBe(false);
    expect(can(manager, "client:delete")).toBe(false);
  });

  it("a profissional vê apenas o que é seu", () => {
    expect(scopeOf(sofia, "client:read")).toBe("OWN");
    expect(scopeOf(sofia, "appointment:read")).toBe("OWN");
    expect(scopeOf(sofia, "commission:read")).toBe("OWN");
    expect(scopeOf(sofia, "professional:pay_data")).toBe("OWN");
  });

  it("a profissional não força conflitos de agenda nem edita serviços", () => {
    expect(can(sofia, "appointment:override_conflict")).toBe(false);
    expect(can(sofia, "service:write")).toBe(false);
    expect(can(sofia, "finance:read")).toBe(false);
    expect(can(sofia, "commission:approve")).toBe(false);
  });

  it("a rececionista marca e cobra mas não vê margens nem salários", () => {
    expect(canAll(reception, "appointment:create")).toBe(true);
    expect(canAll(reception, "client:read")).toBe(true);
    expect(can(reception, "finance:read")).toBe(false);
    expect(can(reception, "commission:read")).toBe(false);
    expect(can(reception, "professional:pay_data")).toBe(false);
  });

  it("a rececionista não acede a dados de saúde", () => {
    // Categoria especial RGPD: só quem executa o serviço precisa.
    expect(can(reception, "client:health:read")).toBe(false);
    expect(can(reception, "client:health:write")).toBe(false);
  });

  it("o financeiro vê dinheiro mas não fichas clínicas nem notas", () => {
    expect(canAll(finance, "finance:read")).toBe(true);
    expect(canAll(finance, "report:financial")).toBe(true);
    expect(canAll(finance, "professional:pay_data")).toBe(true);
    expect(can(finance, "client:health:read")).toBe(false);
    expect(can(finance, "client:read")).toBe(false);
    expect(can(finance, "appointment:create")).toBe(false);
  });

  it("o papel de leitura não escreve nada", () => {
    const writes: Permission[] = [
      "client:create",
      "client:update",
      "appointment:create",
      "service:write",
      "inventory:write",
      "finance:write",
      "message:send",
      "settings:write",
    ];
    for (const p of writes) expect(can(readonly, p)).toBe(false);
  });
});

describe("grants e revokes", () => {
  it("um grant eleva uma permissão a escopo total", () => {
    const sofiaPlus = actor({
      role: "PROFESSIONAL",
      professionalId: "prof_sofia",
      grants: ["client:read"],
    });
    expect(scopeOf(sofiaPlus, "client:read")).toBe("ALL");
  });

  it("um revoke retira mesmo à proprietária", () => {
    const limitedOwner = actor({ role: "OWNER", revokes: ["client:delete"] });
    expect(can(limitedOwner, "client:delete")).toBe(false);
  });

  it("o revoke ganha ao grant quando ambos existem", () => {
    // Em caso de dúvida, negar. É a política segura.
    const conflicted = actor({
      role: "PROFESSIONAL",
      grants: ["finance:read"],
      revokes: ["finance:read"],
    });
    expect(can(conflicted, "finance:read")).toBe(false);
  });
});

describe("assertCan", () => {
  it("deixa passar quem pode", () => {
    expect(() => assertCan(owner, "client:delete")).not.toThrow();
  });

  it("atira ForbiddenError com o nome da permissão", () => {
    expect(() => assertCan(sofia, "finance:read")).toThrow(ForbiddenError);
    expect(() => assertCan(sofia, "finance:read")).toThrow(/finance:read/);
  });
});

describe("escopo de clientes", () => {
  it("a proprietária vê toda a unidade", () => {
    const where = clientScope(owner);
    expect(where).toEqual({ unitId: UNIT, deletedAt: null });
  });

  it("a profissional só vê quem é sua ou já atendeu", () => {
    const where = clientScope(sofia) as Record<string, unknown>;
    expect(where.unitId).toBe(UNIT);
    expect(where.OR).toEqual([
      { ownerProfessionalId: "prof_sofia" },
      { appointments: { some: { professionalId: "prof_sofia" } } },
    ]);
  });

  it("filtra sempre por unidade — nunca há fuga entre unidades", () => {
    for (const a of [owner, manager, sofia, reception, readonly]) {
      const where = clientScope(a) as Record<string, unknown>;
      expect(where.unitId).toBe(UNIT);
    }
  });

  it("exclui registos apagados por soft delete", () => {
    const where = clientScope(owner) as Record<string, unknown>;
    expect(where.deletedAt).toBeNull();
  });

  it("nega a quem não tem a permissão", () => {
    expect(() => clientScope(finance)).toThrow(ForbiddenError);
  });
});

describe("escopo de marcações", () => {
  it("a profissional só vê a sua agenda", () => {
    expect(appointmentScope(sofia)).toEqual({
      unitId: UNIT,
      deletedAt: null,
      professionalId: "prof_sofia",
    });
  });

  it("a rececionista vê a agenda toda — precisa dela para marcar", () => {
    expect(appointmentScope(reception)).toEqual({
      unitId: UNIT,
      deletedAt: null,
    });
  });
});

describe("escopo de equipa e comissões", () => {
  it("a profissional só se vê a si própria", () => {
    expect(professionalScope(sofia)).toEqual({
      unitId: UNIT,
      deletedAt: null,
      id: "prof_sofia",
    });
  });

  it("a profissional só vê as suas comissões", () => {
    expect(commissionScope(sofia)).toEqual({
      unitId: UNIT,
      professionalId: "prof_sofia",
    });
  });

  it("um utilizador sem perfil de profissional não apanha tudo por engano", () => {
    // Um actor com escopo OWN mas sem professionalId não pode cair num filtro
    // vazio — isso mostraria a carteira inteira.
    const orphan = actor({ role: "PROFESSIONAL", professionalId: null });
    const where = professionalScope(orphan) as Record<string, unknown>;
    expect(where.id).toBe("__none__");
    expect(commissionScope(orphan)).toEqual({
      unitId: UNIT,
      professionalId: "__none__",
    });
  });
});

describe("actor sem professionalId nunca vê registos órfãos", () => {
  // Em Prisma, `ownerProfessionalId: null` significa "onde o dono É NULO" e
  // devolveria todas as fichas sem responsável — não zero fichas. A sentinela
  // "__none__" é o que garante conjunto vazio.
  const orphan = actor({ role: "PROFESSIONAL", professionalId: null });

  it("clientScope não usa null no filtro de dono", () => {
    const where = clientScope(orphan) as Record<string, unknown>;
    expect(where.OR).toEqual([
      { ownerProfessionalId: "__none__" },
      { appointments: { some: { professionalId: "__none__" } } },
    ]);
  });

  it("appointmentScope não usa null no filtro de profissional", () => {
    expect(appointmentScope(orphan)).toEqual({
      unitId: UNIT,
      deletedAt: null,
      professionalId: "__none__",
    });
  });

  it("nenhum helper de escopo devolve null como valor de filtro", () => {
    const scopes = [
      clientScope(orphan),
      appointmentScope(orphan),
      professionalScope(orphan),
      commissionScope(orphan),
    ];

    for (const where of scopes) {
      for (const [key, value] of Object.entries(where)) {
        // `deletedAt: null` é intencional — é o filtro de soft delete.
        if (key === "deletedAt") continue;
        expect(value).not.toBeNull();
      }
    }
  });
});

describe("assertOwns — bloqueia acesso por ID direto", () => {
  it("deixa a Sofia abrir um registo seu", () => {
    expect(() =>
      assertOwns(sofia, "appointment:update", "prof_sofia"),
    ).not.toThrow();
  });

  it("impede a Sofia de abrir um registo da Inês", () => {
    // É o teste que apanha o buraco que a filtragem de listas não cobre.
    expect(() => assertOwns(sofia, "appointment:update", "prof_ines")).toThrow(
      ForbiddenError,
    );
  });

  it("a Inês também não chega aos registos da Sofia", () => {
    expect(() => assertOwns(ines, "client:update", "prof_sofia")).toThrow(
      ForbiddenError,
    );
  });

  it("quem tem escopo total passa em qualquer registo", () => {
    expect(() =>
      assertOwns(owner, "appointment:update", "prof_sofia"),
    ).not.toThrow();
    expect(() =>
      assertOwns(manager, "appointment:update", "prof_ines"),
    ).not.toThrow();
  });

  it("quem não tem a permissão é barrado antes de olhar ao dono", () => {
    expect(() => assertOwns(readonly, "appointment:update", null)).toThrow(
      ForbiddenError,
    );
  });
});
