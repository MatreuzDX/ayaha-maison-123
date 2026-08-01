/**
 * Preenche imagem, destaques e descrição longa nos 7 serviços reais.
 *
 * Não cria serviços novos — liga a cópia de marketing herdada do site aos
 * registos que já existem, escolhidos pela equipa (preço, duração). Uma
 * fonte de verdade para os números, outra para o texto de venda; aqui só
 * se junta a segunda à primeira.
 *
 * Uso: DATABASE_URL=... node scripts/preencher-catalogo-publico.mjs
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Chave: parte do nome que identifica o serviço na base (case-insensitive).
// Os nomes de "Gatinho"/"Esquilo" no site ficaram "Efeito Gatinho"/"Efeito
// Esquilo" no catálogo real — por isso a comparação é por inclusão, não
// igualdade exata.
const CATALOGO = [
  {
    match: "fio a fio",
    imageUrl:
      "https://images.unsplash.com/photo-1548902378-2ec44c906391?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Efeito natural", "Leveza total", "Ideal para iniciantes"],
    longDescription: [
      "A técnica fio a fio é ideal para quem busca um resultado natural, como se fosse rímel bem aplicado.",
      "Perfeito para o dia a dia, com acabamento leve e sofisticado — tudo no conforto da sua casa.",
    ],
    displayCategory: "Clássico",
  },
  {
    match: "volume brasileiro",
    imageUrl:
      "https://images.unsplash.com/photo-1528047128849-2382ff646073?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Fios em Y", "Efeito preenchido", "Baixa manutenção"],
    longDescription: [
      "O Volume Brasileiro utiliza fios pré-montados em Y, criando um efeito de destaque com aparência preenchida e uniforme.",
      "Excelente relação entre volume, durabilidade e conforto.",
    ],
    displayCategory: "Volume",
  },
  {
    match: "volume russo",
    imageUrl:
      "https://images.unsplash.com/photo-1639629509821-c54cdd984227?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Fios 0.05mm", "Leques 4D a 6D", "Duração até 4 semanas"],
    longDescription: [
      "O Volume Russo é uma assinatura da AYAHA MAISON. Aplicamos leques feitos à mão com fios ultraleves, respeitando a saúde do cílio natural.",
      "O resultado é um olhar preenchido, elegante e personalizado de acordo com o formato dos seus olhos.",
    ],
    displayCategory: "Volume",
  },
  {
    match: "volume egípcio",
    imageUrl:
      "https://images.unsplash.com/photo-1633346152343-5486573d3d50?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Efeito alongado", "Densidade elegante", "Mapping personalizado"],
    longDescription: [
      "O Volume Egípcio combina densidade e alongamento, com um desenho que aprofunda e estica o olhar.",
      "Um efeito sofisticado e marcante, mantendo leveza graças aos fios de baixa espessura.",
    ],
    displayCategory: "Volume",
  },
  {
    match: "fox eyes",
    imageUrl:
      "https://images.unsplash.com/photo-1542833807-ad5af0977050?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Mapping personalizado", "Efeito lifting", "Ar felino"],
    longDescription: [
      "O efeito Fox Eyes cria um alongamento estratégico no canto externo dos olhos, para um olhar mais puxado e sofisticado.",
      "Trabalhamos o mapping de forma personalizada para valorizar a sua expressão natural.",
    ],
    displayCategory: "Efeitos",
  },
  {
    match: "gatinho",
    imageUrl:
      "https://images.unsplash.com/photo-1633276115947-8d35f394a309?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Olhar levantado", "Efeito charmoso", "Acabamento delicado"],
    longDescription: [
      "O efeito Gatinho realça o canto externo dos olhos, criando um olhar levantado, doce e sedutor.",
      "Ideal para quem quer um toque marcante sem perder a naturalidade.",
    ],
    displayCategory: "Efeitos",
  },
  {
    match: "esquilo",
    imageUrl:
      "https://images.unsplash.com/photo-1590556409324-aa1d726e5c3c?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Efeito penteado", "Textura marcante", "Volume moderno"],
    longDescription: [
      "O efeito Esquilo brinca com a direção dos fios, com um pico texturizado que dá volume e movimento ao olhar.",
      "Um look moderno e cheio, muito procurado por quem gosta de tendências.",
    ],
    displayCategory: "Efeitos",
  },
];

async function main() {
  const services = await prisma.service.findMany({
    select: { id: true, name: true },
  });

  let updated = 0;
  const semCorrespondencia = [];

  for (const entry of CATALOGO) {
    const service = services.find((s) =>
      s.name.toLowerCase().includes(entry.match),
    );
    if (!service) {
      semCorrespondencia.push(entry.match);
      continue;
    }

    await prisma.service.update({
      where: { id: service.id },
      data: {
        imageUrl: entry.imageUrl,
        highlights: entry.highlights,
        longDescription: entry.longDescription,
        displayCategory: entry.displayCategory,
      },
    });
    console.log(`  ✓ ${service.name}`);
    updated++;
  }

  console.log(`\n${updated} serviços atualizados.`);
  if (semCorrespondencia.length) {
    console.log("Sem correspondência:", semCorrespondencia.join(", "));
  }
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
