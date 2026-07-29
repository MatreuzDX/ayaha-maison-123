import { describe, expect, it } from "vitest";
import {
  appointmentCode,
  formatAddress,
  formatPhone,
  fullName,
  giftCardCode,
  initials,
  invoiceNumber,
  isValidPhone,
  isValidPostalCode,
  normalizePhone,
  normalizePostalCode,
  postalPrefix,
  randomCode,
  rewardCode,
  slugify,
  whatsappLink,
} from "@/lib/format";

const norm = (s: string) => s.replace(/[  ]/g, " ");

describe("normalizePhone", () => {
  it("normaliza os formatos que uma cliente escreve", () => {
    // O número real do negócio, escrito de várias maneiras
    expect(normalizePhone("933055502")).toBe("+351933055502");
    expect(normalizePhone("933 055 502")).toBe("+351933055502");
    expect(normalizePhone("+351 933 055 502")).toBe("+351933055502");
    expect(normalizePhone("+351933055502")).toBe("+351933055502");
  });

  it("aceita números estrangeiros em formato internacional", () => {
    expect(normalizePhone("+34600000000")).toBe("+34600000000");
  });

  it("devolve null em vez de gravar lixo", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("não é telefone")).toBeNull();
  });
});

describe("isValidPhone", () => {
  it("valida sem atirar", () => {
    expect(isValidPhone("933055502")).toBe(true);
    expect(isValidPhone("1")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
});

describe("formatPhone", () => {
  it("apresenta números portugueses em formato nacional", () => {
    expect(norm(formatPhone("+351933055502"))).toBe("933 055 502");
  });

  it("apresenta estrangeiros em formato internacional", () => {
    expect(norm(formatPhone("+34600000000"))).toContain("+34");
  });
});

describe("whatsappLink", () => {
  it("constrói o link sem o sinal de mais", () => {
    expect(whatsappLink("+351933055502")).toBe("https://wa.me/351933055502");
  });

  it("codifica o texto pré-preenchido", () => {
    const link = whatsappLink("+351933055502", "Olá! A sua marcação está confirmada.");
    expect(link).toContain("?text=");
    expect(link).toContain("Ol%C3%A1");
  });
});

describe("nomes", () => {
  it("junta nome e apelido", () => {
    expect(fullName("Marta", "Silva")).toBe("Marta Silva");
    expect(fullName("Marta")).toBe("Marta");
    expect(fullName("Marta", null)).toBe("Marta");
  });

  it("gera iniciais para avatares", () => {
    expect(initials("Marta", "Silva")).toBe("MS");
    expect(initials("Marta")).toBe("M");
    expect(initials("ana", "costa")).toBe("AC");
  });
});

describe("códigos legíveis", () => {
  it("nunca usa caracteres ambíguos ao telefone", () => {
    // Um código ditado ao telefone não pode ter 0/O nem 1/I/L.
    const ambiguous = /[0O1IL2Z5S]/;
    for (let i = 0; i < 200; i++) {
      expect(randomCode(8)).not.toMatch(ambiguous);
    }
  });

  it("respeita o comprimento pedido", () => {
    expect(randomCode(4)).toHaveLength(4);
    expect(randomCode(12)).toHaveLength(12);
  });

  it("gera código de marcação com dia e mês legíveis", () => {
    const code = appointmentCode(new Date(Date.UTC(2026, 7, 5)));
    expect(code).toMatch(/^AYA-0508-[A-Z0-9]{3}$/);
  });

  it("gera código de gift card", () => {
    expect(giftCardCode()).toMatch(/^AYA-GIFT-[A-Z0-9]{4}$/);
  });

  it("gera código de recompensa do AYAHA Club", () => {
    expect(rewardCode()).toMatch(/^AYA-[A-Z0-9]{4}$/);
  });

  it("numera faturas com ano e sequência preenchida", () => {
    expect(invoiceNumber(2026, 1)).toBe("2026/0001");
    expect(invoiceNumber(2026, 42)).toBe("2026/0042");
    expect(invoiceNumber(2026, 1234)).toBe("2026/1234");
  });

  it("gera códigos distintos (sem colisões óbvias)", () => {
    const codes = new Set(Array.from({ length: 500 }, () => randomCode(6)));
    expect(codes.size).toBeGreaterThan(495);
  });
});

describe("códigos postais portugueses", () => {
  it("normaliza para o formato 0000-000", () => {
    expect(normalizePostalCode("1500123")).toBe("1500-123");
    expect(normalizePostalCode("1500-123")).toBe("1500-123");
    expect(normalizePostalCode("1500 123")).toBe("1500-123");
  });

  it("rejeita comprimentos errados", () => {
    expect(normalizePostalCode("1500")).toBeNull();
    expect(normalizePostalCode("150012345")).toBeNull();
    expect(isValidPostalCode("abc")).toBe(false);
  });

  it("extrai o prefixo que resolve a zona de deslocação", () => {
    // Benfica é 1500 → zona "Lisboa Norte/Ocidental"
    expect(postalPrefix("1500-123")).toBe("1500");
    // Almada é 2800 → zona "Margem Sul"
    expect(postalPrefix("2800-000")).toBe("2800");
    expect(postalPrefix("inválido")).toBeNull();
  });
});

describe("formatAddress", () => {
  it("junta as partes existentes e ignora as vazias", () => {
    expect(
      formatAddress({
        addressLine: "Rua das Flores 12",
        addressExtra: "3.º Dto",
        postalCode: "1500-123",
        city: "Lisboa",
      }),
    ).toBe("Rua das Flores 12, 3.º Dto, 1500-123 Lisboa");
  });

  it("aguenta morada incompleta sem deixar vírgulas soltas", () => {
    expect(formatAddress({ addressLine: "Rua das Flores 12", city: "Lisboa" })).toBe(
      "Rua das Flores 12, Lisboa",
    );
    expect(formatAddress({})).toBe("");
  });
});

describe("slugify", () => {
  it("remove acentos portugueses", () => {
    expect(slugify("Volume Egípcio")).toBe("volume-egipcio");
    expect(slugify("Efeito Gatinho")).toBe("efeito-gatinho");
    expect(slugify("Manutenção")).toBe("manutencao");
    expect(slugify("Sobrancelhas & Cílios")).toBe("sobrancelhas-cilios");
  });

  it("não deixa hífenes nas pontas", () => {
    expect(slugify("  Fio a Fio  ")).toBe("fio-a-fio");
    expect(slugify("---teste---")).toBe("teste");
  });

  it("reproduz os slugs reais do catálogo", () => {
    const catalogo = [
      ["Fio a Fio", "fio-a-fio"],
      ["Volume Brasileiro", "volume-brasileiro"],
      ["Volume Russo", "volume-russo"],
      ["Volume Egípcio", "volume-egipcio"],
      ["Fox Eyes", "fox-eyes"],
      ["Efeito Gatinho", "efeito-gatinho"],
      ["Efeito Esquilo", "efeito-esquilo"],
    ] as const;
    for (const [name, slug] of catalogo) {
      expect(slugify(name)).toBe(slug);
    }
  });
});
