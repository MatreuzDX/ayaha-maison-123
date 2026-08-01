/**
 * Cria uma conta de cliente de teste, para verificar o login único
 * ponta a ponta antes de existir um formulário de registo público.
 *
 * Uso: DATABASE_URL=... node scripts/criar-conta-cliente-teste.mjs
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import "dotenv/config";

const ARGON_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const EMAIL = "cliente.teste@exemplo.pt";
const PASSWORD = "TesteCliente123";

async function main() {
  const unit = await prisma.unit.findFirst();
  if (!unit) throw new Error("Sem unidade — corra o seed primeiro.");

  const passwordHash = await hash(PASSWORD, ARGON_OPTIONS);

  const client = await prisma.client.create({
    data: {
      unitId: unit.id,
      firstName: "Cliente",
      lastName: "Teste",
      email: EMAIL,
      phone: "+351900000001",
      status: "ACTIVE",
      source: "WEBSITE",
    },
  });

  await prisma.clientAccount.create({
    data: { clientId: client.id, email: EMAIL, passwordHash },
  });

  console.log("Conta de teste criada:");
  console.log("  email:", EMAIL);
  console.log("  password:", PASSWORD);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
