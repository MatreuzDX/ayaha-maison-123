/**
 * Seed da base de dados.
 *
 * Cria a unidade, a equipa, o catálogo REAL de 7 serviços a €30, as zonas de
 * deslocação, o AYAHA Club com as 3 recompensas, materiais e 20 clientes
 * fictícias com cartões de fidelidade em estados variados.
 *
 * É idempotente: correr duas vezes não duplica nada.
 *
 * Correr com: npm run db:seed
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import { hash as argonHash } from "@node-rs/argon2";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não definida.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const ARGON = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

// ─────────────────────────────────────────────────────────────
// CATÁLOGO REAL — confirmado pela fundadora em 2026-07-27
// Sete serviços, todos a €30. Não é erro: é decisão de negócio.
// ─────────────────────────────────────────────────────────────
const SERVICES = [
  { name: "Fio a Fio", slug: "fio-a-fio", durationMin: 90, tagline: "O clássico. Um fio por cada cílio natural." },
  { name: "Volume Brasileiro", slug: "volume-brasileiro", durationMin: 120, tagline: "Volume natural e leve, efeito preenchido." },
  { name: "Volume Russo", slug: "volume-russo", durationMin: 120, tagline: "Máximo volume, leques finos e densos." },
  { name: "Volume Egípcio", slug: "volume-egipcio", durationMin: 120, tagline: "Efeito dramático com desenho marcado." },
  { name: "Fox Eyes", slug: "fox-eyes", durationMin: 120, tagline: "Olhar alongado e elevado nas pontas." },
  { name: "Efeito Gatinho", slug: "efeito-gatinho", durationMin: 90, tagline: "Cantos externos alongados, olhar felino." },
  { name: "Efeito Esquilo", slug: "efeito-esquilo", durationMin: 90, tagline: "Elevação no terço médio, olhar aberto." },
] as const;

const PRICE_CENTS = 3000; // €30 — igual em todos os serviços
const MAINTENANCE_GAP_DAYS = 21;

// ─────────────────────────────────────────────────────────────
// ZONAS DE DESLOCAÇÃO — PROPOSTA, pendente de confirmação
// Ver Anexo A da especificação, ponto 5.
// ─────────────────────────────────────────────────────────────
const TRAVEL_ZONES = [
  { name: "Lisboa Centro", feeCents: 500, freeAboveCents: 6000, minSpendCents: 0, estimatedMin: 20, prefixes: ["1000","1050","1070","1100","1150","1200","1250"] },
  { name: "Lisboa Norte/Ocidental", feeCents: 500, freeAboveCents: 6000, minSpendCents: 0, estimatedMin: 15, prefixes: ["1400","1449","1500","1600","1649","1700","1749"] },
  { name: "Lisboa Oriental", feeCents: 700, freeAboveCents: 8000, minSpendCents: 4000, estimatedMin: 25, prefixes: ["1800","1849","1900","1950","1990"] },
  { name: "Grande Lisboa", feeCents: 1000, freeAboveCents: 10000, minSpendCents: 6000, estimatedMin: 35, prefixes: ["2600","2610","2620","2650","2670","2700","2710","2720","2725","2730","2735","2740","2750","2765","2775","2780","2790","2795"] },
  { name: "Margem Sul", feeCents: 1500, freeAboveCents: 15000, minSpendCents: 8000, estimatedMin: 45, prefixes: ["2800","2810","2825","2830","2840","2845","2855","2860","2870","2900","2910","2950","2970"] },
] as const;

const MATERIALS = [
  { name: "Cola Premium 5ml", category: "COLA", unit: "ml", qty: 25, min: 10, costCents: 2200, tracksExpiry: true },
  { name: "Fios 0.15 C 8-14mm", category: "FIOS", unit: "cartela", qty: 12, min: 4, costCents: 850, tracksExpiry: false },
  { name: "Fios 0.07 D 8-15mm", category: "FIOS", unit: "cartela", qty: 10, min: 4, costCents: 1100, tracksExpiry: false },
  { name: "Primer de cílios 15ml", category: "LIMPEZA", unit: "ml", qty: 45, min: 15, costCents: 1400, tracksExpiry: true },
  { name: "Removedor em gel 15g", category: "LIMPEZA", unit: "g", qty: 30, min: 10, costCents: 1600, tracksExpiry: true },
  { name: "Adesivos de pestana inferior", category: "DESCARTAVEL", unit: "par", qty: 200, min: 50, costCents: 25, tracksExpiry: false },
  { name: "Micro-escovilhões", category: "DESCARTAVEL", unit: "un", qty: 400, min: 100, costCents: 4, tracksExpiry: false },
  { name: "Fita micropore", category: "DESCARTAVEL", unit: "un", qty: 15, min: 5, costCents: 120, tracksExpiry: false },
] as const;

/** Consumo médio por atendimento. Base do abate automático de stock. */
const BOM = [
  { material: "Cola Premium 5ml", quantity: 0.25 },
  { material: "Primer de cílios 15ml", quantity: 0.5 },
  { material: "Adesivos de pestana inferior", quantity: 1 },
  { material: "Micro-escovilhões", quantity: 4 },
  { material: "Fita micropore", quantity: 0.1 },
] as const;

const FIRST_NAMES = ["Marta","Sofia","Inês","Rita","Catarina","Beatriz","Mariana","Joana","Carolina","Leonor","Matilde","Francisca","Diana","Patrícia","Andreia","Vera","Cláudia","Sara","Filipa","Raquel"];
const LAST_NAMES = ["Silva","Santos","Ferreira","Pereira","Oliveira","Costa","Rodrigues","Martins","Jesus","Sousa","Fernandes","Gonçalves","Gomes","Lopes","Marques","Alves","Almeida","Ribeiro","Pinto","Carvalho"];

async function main() {
  console.log("A semear a base de dados AYAHA CRM…\n");

  // ── Unidade ────────────────────────────────────────────────
  const unit = await prisma.unit.upsert({
    where: { slug: process.env.DEFAULT_UNIT_SLUG ?? "benfica" },
    update: {},
    create: {
      name: "AYAHA MAISON — Benfica",
      slug: process.env.DEFAULT_UNIT_SLUG ?? "benfica",
      timezone: "Europe/Lisbon",
      currency: "EUR",
      baseAddress: "Benfica, Lisboa",
      baseLat: 38.7503,
      baseLng: -9.2013,
    },
  });
  console.log(`✓ Unidade: ${unit.name}`);

  // ── Utilizadores e profissionais ───────────────────────────
  // Dados de demonstração (equipa e clientes inventadas) só entram se pedidos.
  const wantsDemo =
    process.env.SEED_DEMO_CLIENTS === "true" || process.env.DEMO_MODE === "true";

  // Sem palavra-passe não se cria conta nenhuma — nunca uma por defeito. O
  // resto (catálogo, zonas, AYAHA Club) entra na mesma, para o site público
  // funcionar logo; a conta de administração aparece no deploy seguinte a
  // SEED_OWNER_EMAIL e SEED_OWNER_PASSWORD serem definidas.
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  // Em modo demonstração aceita-se uma palavra-passe curta para testes.
  // Fora dele exigem-se 10 caracteres, como em qualquer conta real.
  const isDemo = process.env.DEMO_MODE === "true";
  const minLength = isDemo ? 6 : 10;
  if (!ownerPassword) {
    console.log(
      "⚠ SEED_OWNER_PASSWORD não definida — conta de administração não criada.\n",
    );
  } else if (ownerPassword.length < minLength) {
    throw new Error(
      `SEED_OWNER_PASSWORD tem de ter pelo menos ${minLength} caracteres.`,
    );
  }
  if (isDemo) {
    console.log("⚠ Modo DEMONSTRAÇÃO — credenciais fracas permitidas.\n");
  }

  const owner = { email: process.env.SEED_OWNER_EMAIL ?? "ayaha@ayahamaison.com", name: "Ayaha", role: "OWNER" as const, color: "#C4A870", contract: "OWNER" as const };
  // Sofia e Inês são inventadas e entrariam com a palavra-passe da dona. Em
  // produção seriam duas contas falsas com acesso ao CRM — só em demonstração.
  const demoStaff = [
    { email: "sofia@ayahamaison.com", name: "Sofia Marques", role: "PROFESSIONAL" as const, color: "#C99A93", contract: "FREELANCER" as const },
    { email: "ines@ayahamaison.com", name: "Inês Ramos", role: "PROFESSIONAL" as const, color: "#B3A292", contract: "FREELANCER" as const },
  ];
  const team = ownerPassword ? [owner, ...(wantsDemo ? demoStaff : [])] : [];

  const passwordHash = ownerPassword ? await argonHash(ownerPassword, ARGON) : "";
  const professionals: { id: string; name: string }[] = [];

  for (const member of team) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: { email: member.email, name: member.name, passwordHash },
    });

    await prisma.userUnit.upsert({
      where: { userId_unitId: { userId: user.id, unitId: unit.id } },
      update: { role: member.role },
      create: { userId: user.id, unitId: unit.id, role: member.role },
    });

    const professional = await prisma.professional.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        unitId: unit.id,
        displayName: member.name,
        color: member.color,
        contractType: member.contract,
        hasVehicle: true,
        transportMode: "DRIVING",
        maxTravelMin: 45,
        homeLat: 38.7503,
        homeLng: -9.2013,
      },
    });
    professionals.push({ id: professional.id, name: member.name });

    // Horário base: segunda a sábado, 09:00–19:00 (sábado até às 17:00)
    const existingHours = await prisma.workingHour.count({
      where: { professionalId: professional.id },
    });
    if (existingHours === 0) {
      await prisma.workingHour.createMany({
        data: [1, 2, 3, 4, 5, 6].map((weekday) => ({
          professionalId: professional.id,
          weekday,
          startMin: 9 * 60,
          endMin: weekday === 6 ? 17 * 60 : 19 * 60,
        })),
      });
    }
  }
  console.log(`✓ Equipa: ${professionals.map((p) => p.name).join(", ") || "(nenhuma conta criada)"}`);

  // ── Zonas de deslocação ────────────────────────────────────
  const zones: { id: string; name: string }[] = [];
  for (const [i, z] of TRAVEL_ZONES.entries()) {
    const zone = await prisma.travelZone.upsert({
      where: { unitId_name: { unitId: unit.id, name: z.name } },
      update: {},
      create: {
        unitId: unit.id,
        name: z.name,
        feeCents: z.feeCents,
        freeAboveCents: z.freeAboveCents,
        minSpendCents: z.minSpendCents,
        estimatedMin: z.estimatedMin,
        postalPrefixes: [...z.prefixes],
        sortOrder: i,
      },
    });
    zones.push({ id: zone.id, name: zone.name });
  }
  console.log(`✓ ${zones.length} zonas de deslocação`);

  // ── Catálogo de serviços ───────────────────────────────────
  const category = await prisma.serviceCategory.upsert({
    where: { unitId_slug: { unitId: unit.id, slug: "cilios" } },
    update: {},
    create: { unitId: unit.id, name: "Cílios", slug: "cilios", sortOrder: 0 },
  });

  const serviceIds: string[] = [];
  for (const [i, s] of SERVICES.entries()) {
    const service = await prisma.service.upsert({
      where: { unitId_slug: { unitId: unit.id, slug: s.slug } },
      update: {},
      create: {
        unitId: unit.id,
        categoryId: category.id,
        name: s.name,
        slug: s.slug,
        tagline: s.tagline,
        durationMin: s.durationMin,
        setupMin: 15,
        teardownMin: 5,
        priceCents: PRICE_CENTS,
        // IVA a 0: a fundadora está muito provavelmente na isenção do art. 53.º
        // do CIVA. Confirmar com o contabilista (Anexo A, ponto 1).
        vatBps: 0,
        recommendedGapDays: MAINTENANCE_GAP_DAYS,
        minAdvanceHours: 12,
        maxAdvanceDays: 90,
        sortOrder: i,
      },
    });
    serviceIds.push(service.id);
  }
  console.log(`✓ ${serviceIds.length} serviços a €30`);

  // Todas as profissionais sabem fazer todos os serviços
  for (const professional of professionals) {
    for (const serviceId of serviceIds) {
      await prisma.professionalSkill.upsert({
        where: {
          professionalId_serviceId: {
            professionalId: professional.id,
            serviceId,
          },
        },
        update: {},
        create: { professionalId: professional.id, serviceId, proficiency: 4 },
      });
    }
  }
  console.log("✓ Competências atribuídas");

  // ── Materiais e BOM ────────────────────────────────────────
  const materialByName = new Map<string, string>();
  for (const m of MATERIALS) {
    const existing = await prisma.material.findFirst({
      where: { unitId: unit.id, name: m.name },
    });
    const material =
      existing ??
      (await prisma.material.create({
        data: {
          unitId: unit.id,
          name: m.name,
          category: m.category,
          unit_: m.unit,
          quantityOnHand: m.qty,
          minQuantity: m.min,
          reorderQuantity: m.min * 3,
          costCents: m.costCents,
          lastCostCents: m.costCents,
          tracksExpiry: m.tracksExpiry,
        },
      }));
    materialByName.set(m.name, material.id);
  }

  for (const serviceId of serviceIds) {
    for (const item of BOM) {
      const materialId = materialByName.get(item.material);
      if (!materialId) continue;
      await prisma.serviceMaterial.upsert({
        where: { serviceId_materialId: { serviceId, materialId } },
        update: {},
        create: { serviceId, materialId, quantity: item.quantity },
      });
    }
  }
  console.log(`✓ ${MATERIALS.length} materiais com consumo por serviço`);

  // ── AYAHA Club ─────────────────────────────────────────────
  const program = await prisma.loyaltyProgram.upsert({
    where: { unitId: unit.id },
    update: {},
    create: {
      unitId: unit.id,
      name: "AYAHA Club",
      stampsRequired: 5,
      autoRestart: true,
      rewardValidDays: 180,
      termsText:
        "A cada atendimento concluído recebe 1 carimbo. Ao completar 5 carimbos " +
        "escolhe uma de três recompensas. O cartão recomeça depois do resgate.",
    },
  });

  const REWARDS = [
    { name: "Desconto de €15", description: "€15 de desconto no próximo atendimento.", kind: "DISCOUNT_FIXED" as const, valueCents: 1500 },
    // ⚠️ Sem valor económico com preço único de €30 — ver spec 18.1 e Anexo A ponto 9.
    { name: "Upgrade de técnica", description: "Upgrade de técnica gratuito no próximo atendimento.", kind: "SERVICE_UPGRADE" as const, valueCents: 0 },
    { name: "Gift Card de €15", description: "Gift card de €15 para oferecer a uma amiga.", kind: "GIFT_CARD" as const, valueCents: 1500 },
  ];

  const existingRewards = await prisma.reward.count({
    where: { programId: program.id },
  });
  if (existingRewards === 0) {
    await prisma.reward.createMany({
      data: REWARDS.map((r, i) => ({ ...r, programId: program.id, sortOrder: i })),
    });
  }
  console.log("✓ AYAHA Club com 3 recompensas");

  // ── Regra de comissão ──────────────────────────────────────
  const existingRule = await prisma.commissionRule.findFirst({
    where: { unitId: unit.id, professionalId: null },
  });
  if (!existingRule) {
    await prisma.commissionRule.create({
      data: {
        unitId: unit.id,
        basis: "SERVICE_REVENUE",
        // 40% é referência de mercado. Com serviço a €30 e 120 min de trabalho
        // dá €12 por duas horas — confirmar com a fundadora (Anexo A, ponto 2).
        rateBps: 4000,
        deductTravel: true,
        deductMaterials: false,
      },
    });
  }

  // ── Categorias de despesa ──────────────────────────────────
  for (const name of ["Material","Transporte","Marketing","Formação","Software","Seguros","Outros"]) {
    await prisma.expenseCategory.upsert({
      where: { unitId_name: { unitId: unit.id, name } },
      update: {},
      create: { unitId: unit.id, name, isFixed: ["Software","Seguros"].includes(name) },
    });
  }

  // ── Etiquetas de cliente ───────────────────────────────────
  const TAGS = [
    { name: "Sensível à cola", color: "#A33A3A" },
    { name: "Prefere manhã", color: "#3A6EA5" },
    { name: "Prefere tarde", color: "#B8860B" },
    { name: "Indica muito", color: "#2F7A4F" },
    { name: "Morada por confirmar", color: "#8A8A8A" },
  ];
  for (const tag of TAGS) {
    await prisma.clientTag.upsert({
      where: { unitId_name: { unitId: unit.id, name: tag.name } },
      update: {},
      create: { unitId: unit.id, ...tag },
    });
  }
  console.log(`✓ ${TAGS.length} etiquetas`);

  // ── Clientes de demonstração ───────────────────────────────
  // Só entram se forem pedidas. Um arranque real de negócio começa com zero
  // clientes: 20 nomes inventados na base de um negócio a sério são mentira
  // à equipa e sujam relatórios, marketing e fidelidade desde o primeiro dia.
  // Ver AYAHA-SKILLS/honestidade-no-produto.
  // As clientes inventadas precisam de profissionais a quem ficar atribuídas.
  const wantsDemoClients = wantsDemo && professionals.length > 0;
  const existingClients = await prisma.client.count({ where: { unitId: unit.id } });
  if (!wantsDemoClients) {
    console.log(
      "\n(sem clientes de demonstração — definir SEED_DEMO_CLIENTS=true para as criar)",
    );
  } else if (existingClients > 0) {
    console.log(`\n(${existingClients} clientes já existem — a saltar geração)`);
  } else {
    const now = Date.now();
    const clientRows: Prisma.ClientCreateManyInput[] = [];

    for (let i = 0; i < 20; i++) {
      const zone = zones[i % zones.length]!;
      const visitCount = [0, 1, 2, 3, 5, 6, 8, 12][i % 8]!;
      const daysSinceLast = [3, 10, 25, 40, 55, 70, 100, 200][i % 8]!;
      const lastVisitAt =
        visitCount > 0 ? new Date(now - daysSinceLast * 86_400_000) : null;

      const status =
        visitCount === 0
          ? "LEAD"
          : daysSinceLast <= 60
            ? "ACTIVE"
            : daysSinceLast <= 90
              ? "AT_RISK"
              : "DORMANT";

      clientRows.push({
        unitId: unit.id,
        firstName: FIRST_NAMES[i]!,
        lastName: LAST_NAMES[i]!,
        phone: `+3519${String(10_000_000 + i * 137_911).padStart(8, "0")}`,
        email: `${FIRST_NAMES[i]!.toLowerCase()}.${LAST_NAMES[i]!.toLowerCase()}@exemplo.pt`,
        city: "Lisboa",
        travelZoneId: zone.id,
        status,
        source: (["INSTAGRAM","REFERRAL","WHATSAPP","GOOGLE","WEBSITE"] as const)[i % 5]!,
        ownerProfessionalId: professionals[i % professionals.length]!.id,
        visitCount,
        lastVisitAt,
        firstVisitAt:
          visitCount > 0
            ? new Date(now - (daysSinceLast + visitCount * 21) * 86_400_000)
            : null,
        lifetimeValueCents: visitCount * PRICE_CENTS,
        avgTicketCents: visitCount > 0 ? PRICE_CENTS : 0,
        avgIntervalDays: visitCount > 1 ? 21 : null,
        marketingOptIn: i % 3 !== 0,
        marketingOptInAt: i % 3 !== 0 ? new Date(now - 90 * 86_400_000) : null,
      });
    }

    await prisma.client.createMany({ data: clientRows });
    const created = await prisma.client.findMany({
      where: { unitId: unit.id },
      select: {
        id: true,
        visitCount: true,
        lastVisitAt: true,
        ownerProfessionalId: true,
        travelZone: { select: { estimatedMin: true } },
      },
    });

    await seedAppointments(created, serviceIds, unit.id);

    // Cartões de fidelidade coerentes com o histórico de visitas:
    // 12 visitas = 2 cartões completos + 1 em curso com 2 carimbos.
    for (const client of created) {
      const completedCards = Math.floor(client.visitCount / 5);
      const remainder = client.visitCount % 5;

      for (let cycle = 1; cycle <= completedCards; cycle++) {
        const card = await prisma.loyaltyCard.create({
          data: {
            programId: program.id,
            clientId: client.id,
            cycleNumber: cycle,
            stampsCount: 5,
            stampsRequired: 5,
            completedAt: new Date(now - (completedCards - cycle + 1) * 105 * 86_400_000),
            isActive: false,
          },
        });
        await prisma.loyaltyStamp.createMany({
          data: Array.from({ length: 5 }, () => ({ cardId: card.id, reason: "APPOINTMENT" })),
        });
      }

      await prisma.loyaltyCard.create({
        data: {
          programId: program.id,
          clientId: client.id,
          cycleNumber: completedCards + 1,
          stampsCount: remainder,
          stampsRequired: 5,
          isActive: true,
          stamps: {
            create: Array.from({ length: remainder }, () => ({ reason: "APPOINTMENT" })),
          },
        },
      });
    }
    console.log(`✓ 20 clientes com cartões de fidelidade`);
  }

  console.log("\nSeed concluído.");
  if (team[0]) console.log(`Entrar com: ${team[0].email}`);
}

/**
 * Gera o histórico de atendimentos coerente com `visitCount` de cada cliente.
 *
 * Sem isto a demonstração fica incoerente: uma ficha diz "12 visitas" e o
 * histórico aparece vazio. Pior — a agenda e os relatórios não teriam nada
 * para mostrar, e o sistema pareceria avariado.
 *
 * Os horários são atribuídos por slot para respeitar a constraint
 * `appointment_no_overlap`: cada profissional só pode ter um atendimento de
 * cada vez, contando o tempo de deslocação.
 */
async function seedAppointments(
  clients: {
    id: string;
    visitCount: number;
    lastVisitAt: Date | null;
    ownerProfessionalId: string | null;
    travelZone: { estimatedMin: number } | null;
  }[],
  serviceIds: string[],
  unitId: string,
) {
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
  });
  if (services.length === 0) return;

  // Ocupação por profissional, para nunca gerar duas visitas sobrepostas.
  const busy = new Map<string, { from: number; to: number }[]>();

  function fits(
    professionalId: string,
    departAt: number,
    endAt: number,
  ): boolean {
    const slots = busy.get(professionalId) ?? [];
    return !slots.some((s) => departAt < s.to && endAt > s.from);
  }

  function occupy(professionalId: string, from: number, to: number) {
    const slots = busy.get(professionalId) ?? [];
    slots.push({ from, to });
    busy.set(professionalId, slots);
  }

  let created = 0;
  let seq = 0;

  for (const client of clients) {
    if (client.visitCount === 0 || !client.ownerProfessionalId) continue;

    const travelMin = client.travelZone?.estimatedMin ?? 30;
    const lastVisit = client.lastVisitAt?.getTime() ?? Date.now();

    // Visitas espaçadas ~21 dias, a contar da última para trás.
    for (let visit = 0; visit < client.visitCount; visit++) {
      const service = services[seq % services.length]!;
      seq++;

      const dayOffset = visit * MAINTENANCE_GAP_DAYS;
      const day = new Date(lastVisit - dayOffset * 86_400_000);

      // Domingo (0) não se trabalha — empurra para segunda.
      if (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);

      const duration = service.durationMin + service.setupMin + service.teardownMin;

      // Procura uma hora livre entre as 9h e as 18h.
      let placed = false;
      for (let hour = 9; hour <= 17 && !placed; hour++) {
        const startAt = new Date(day);
        startAt.setUTCHours(hour, 0, 0, 0);

        const start = startAt.getTime();
        const end = start + duration * 60_000;
        const depart = start - travelMin * 60_000;

        if (!fits(client.ownerProfessionalId, depart, end)) continue;

        const isPast = end < Date.now();

        await prisma.appointment.create({
          data: {
            unitId,
            code: `AYA-S${String(seq).padStart(4, "0")}`,
            clientId: client.id,
            professionalId: client.ownerProfessionalId,
            status: isPast ? "COMPLETED" : "CONFIRMED",
            startAt,
            endAt: new Date(end),
            departAt: new Date(depart),
            travelToMin: travelMin,
            subtotalCents: service.priceCents,
            totalCents: service.priceCents,
            completedAt: isPast ? new Date(end) : null,
            source: "SEED",
            items: {
              create: {
                serviceId: service.id,
                nameSnapshot: service.name,
                durationMin: service.durationMin,
                unitPriceCents: service.priceCents,
                quantity: 1,
                totalCents: service.priceCents,
              },
            },
          },
        });

        occupy(client.ownerProfessionalId, depart, end);
        placed = true;
        created++;
      }
    }
  }

  // Marcações futuras, para a agenda não aparecer vazia. Só clientes ativas —
  // quem está adormecida não teria naturalmente uma marcação agendada.
  const upcoming = clients
    .filter((c) => c.visitCount > 0 && c.ownerProfessionalId)
    .slice(0, 8);

  let future = 0;
  for (const [index, client] of upcoming.entries()) {
    const service = services[index % services.length]!;
    const travelMin = client.travelZone?.estimatedMin ?? 30;
    const duration = service.durationMin + service.setupMin + service.teardownMin;

    // Espalha pelos próximos 10 dias para a agenda ter vários dias com conteúdo.
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 1 + (index % 10));
    if (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);

    for (let hour = 9; hour <= 17; hour++) {
      const startAt = new Date(day);
      startAt.setUTCHours(hour, 0, 0, 0);

      const start = startAt.getTime();
      const end = start + duration * 60_000;
      const depart = start - travelMin * 60_000;

      if (!fits(client.ownerProfessionalId!, depart, end)) continue;

      await prisma.appointment.create({
        data: {
          unitId,
          code: `AYA-F${String(index + 1).padStart(4, "0")}`,
          clientId: client.id,
          professionalId: client.ownerProfessionalId!,
          status: "CONFIRMED",
          startAt,
          endAt: new Date(end),
          departAt: new Date(depart),
          travelToMin: travelMin,
          subtotalCents: service.priceCents,
          totalCents: service.priceCents,
          source: "SEED",
          items: {
            create: {
              serviceId: service.id,
              nameSnapshot: service.name,
              durationMin: service.durationMin,
              unitPriceCents: service.priceCents,
              quantity: 1,
              totalCents: service.priceCents,
            },
          },
        },
      });

      occupy(client.ownerProfessionalId!, depart, end);
      future++;
      break;
    }
  }

  console.log(`✓ ${created} atendimentos no histórico, ${future} marcações futuras`);
}

main()
  .catch((e) => {
    console.error("\nSeed falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
