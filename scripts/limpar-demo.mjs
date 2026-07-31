/**
 * Remove os dados de demonstração, mantendo a configuração do negócio.
 *
 * Porque não é um `prisma migrate reset`: esse comando apaga tudo, incluindo
 * a equipa, os 7 serviços a €30, as zonas de deslocação, os materiais e o
 * cartão AYAHA Club — tudo o que foi configurado com dados reais e que
 * teria de ser reintroduzido à mão. Aqui apagam-se só as fichas fictícias e
 * o histórico que lhes pertence.
 *
 * Uso:
 *   node scripts/limpar-demo.mjs            → mostra o que vai apagar
 *   node scripts/limpar-demo.mjs --executar → apaga
 *
 * A ligação vem de DATABASE_URL. Para a base de produção, usar a porta 5432
 * (modo sessão), não a 6543 do pooler.
 */

import { Client } from "pg";
import "dotenv/config";

const EXECUTAR = process.argv.includes("--executar");

/**
 * Ordem importa: as chaves estrangeiras obrigam a apagar os filhos primeiro.
 * Uma ordem errada não corrompe nada — a base recusa — mas falha a meio.
 */
const APAGAR = [
  "LoyaltyStamp",
  "LoyaltyCard",
  "RewardRedemption",
  "MappingZone",
  "Mapping",
  "LashProfile",
  "AppointmentPhoto",
  "AppointmentStatusChange",
  "AppointmentItem",
  "Commission",
  "Payment",
  "Invoice",
  "StockMovement",
  "Appointment",
  "TimelineEvent",
  "Consent",
  "Document",
  "ClientTagLink",
  "ClientHealthRecord",
  "ClientAddress",
  "WaitlistEntry",
  "Message",
  "DataRequest",
  "Client",
];

/** Estas ficam. É a configuração real do negócio, não dados de teste. */
const MANTER = [
  "Unit",
  "User",
  "UserUnit",
  "Professional",
  "WorkingHour",
  "Service",
  "ServiceCategory",
  "TravelZone",
  "Material",
  "ServiceMaterial",
  "ProfessionalSkill",
  "LoyaltyProgram",
  "Reward",
  "ClientTag",
  "ExpenseCategory",
  "CommissionRule",
];

async function contar(client, tabela) {
  try {
    const r = await client.query(`SELECT count(*)::int AS n FROM "${tabela}"`);
    return r.rows[0].n;
  } catch {
    return null; // tabela não existe neste schema
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  if (url.includes(":6543")) {
    console.error(
      "Está a usar o pooler (6543). Para apagar em bloco use a ligação\n" +
        "direta na porta 5432 — o pooler em modo transação não aguenta\n" +
        "uma transação longa com dezenas de DELETE.",
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  console.log("\n=== VAI APAGAR ===");
  let total = 0;
  for (const t of APAGAR) {
    const n = await contar(client, t);
    if (n) {
      console.log(`  ${String(n).padStart(5)}  ${t}`);
      total += n;
    }
  }
  if (total === 0) console.log("  (nada — já está limpo)");

  console.log("\n=== VAI MANTER ===");
  for (const t of MANTER) {
    const n = await contar(client, t);
    if (n) console.log(`  ${String(n).padStart(5)}  ${t}`);
  }

  if (!EXECUTAR) {
    console.log(
      `\n${total} registos seriam apagados.` +
        "\nPara apagar mesmo: node scripts/limpar-demo.mjs --executar\n",
    );
    await client.end();
    return;
  }

  console.log(`\nA apagar ${total} registos…`);

  // Tudo numa transação: se algum DELETE falhar, nada é apagado e a base
  // fica exatamente como estava. Meia limpeza seria pior do que nenhuma.
  await client.query("BEGIN");
  try {
    // O AuditLog é append-only por trigger. Desligá-lo é legítimo aqui:
    // estamos a remover o rasto de dados que nunca foram reais.
    await client.query(
      `ALTER TABLE "AuditLog" DISABLE TRIGGER trg_audit_no_delete`,
    );
    await client.query(
      `DELETE FROM "AuditLog" WHERE "entityType" IN ('Client','Appointment','Mapping','LashProfile')`,
    );

    for (const t of APAGAR) {
      const n = await contar(client, t);
      if (n) await client.query(`DELETE FROM "${t}"`);
    }

    await client.query(
      `ALTER TABLE "AuditLog" ENABLE TRIGGER trg_audit_no_delete`,
    );
    await client.query("COMMIT");
    console.log("Concluído. A configuração do negócio ficou intacta.\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Falhou — nada foi apagado:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
