import { describe, expect, it } from "vitest";
import {
  applyBps,
  formatBps,
  formatEUR,
  formatEURCompact,
  parseEUR,
  roundHalfUp,
  subtractFloor,
  sumCents,
  toBps,
  vatOn,
} from "@/lib/money";

/**
 * Intl usa espaço NÃO separável (U+00A0) antes do símbolo de euro em pt-PT.
 * É o comportamento correto da norma, mas não se distingue a olho de um espaço
 * normal — normalizamos para as asserções serem legíveis.
 */
const norm = (s: string) => s.replace(/[  ]/g, " ");

describe("roundHalfUp", () => {
  it("arredonda 0,5 para longe do zero, simetricamente", () => {
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-1.5)).toBe(-2);
    expect(roundHalfUp(-2.5)).toBe(-3);
  });

  it("não mexe em inteiros", () => {
    expect(roundHalfUp(30)).toBe(30);
    expect(roundHalfUp(0)).toBe(0);
  });
});

describe("applyBps", () => {
  it("calcula a comissão de 40% sobre €30 exatamente", () => {
    // O caso real do negócio: serviço a €30, comissão de 40%.
    expect(applyBps(3000, 4000)).toBe(1200);
    expect(norm(formatEUR(applyBps(3000, 4000)))).toBe("12,00 €");
  });

  it("dá zero quando a taxa é zero", () => {
    expect(applyBps(3000, 0)).toBe(0);
  });

  it("devolve o total quando a taxa é 100%", () => {
    expect(applyBps(3000, 10_000)).toBe(3000);
  });

  it("arredonda ao cêntimo sem perder valor", () => {
    // 33,33% de €30 = €9,999 → €10,00
    expect(applyBps(3000, 3333)).toBe(1000);
  });

  it("recusa Floats — dinheiro nunca pode ser fracionário", () => {
    expect(() => applyBps(30.5, 4000)).toThrow(/inteiro em cêntimos/);
  });
});

describe("toBps", () => {
  it("converte uma proporção para basis points", () => {
    expect(toBps(1200, 3000)).toBe(4000);
    expect(toBps(1500, 3000)).toBe(5000);
  });

  it("devolve zero sem dividir por zero", () => {
    expect(toBps(100, 0)).toBe(0);
  });
});

describe("sumCents", () => {
  it("soma valores inteiros", () => {
    expect(sumCents(3000, 3000, 1000)).toBe(7000);
  });

  it("soma vazia é zero", () => {
    expect(sumCents()).toBe(0);
  });

  it("recusa Floats", () => {
    expect(() => sumCents(3000, 0.1)).toThrow();
  });
});

describe("subtractFloor", () => {
  it("nunca deixa o total negativo", () => {
    // Recompensa de €15 num serviço de €30 → €15
    expect(subtractFloor(3000, 1500)).toBe(1500);
    // Desconto maior do que o total → 0, não negativo
    expect(subtractFloor(3000, 5000)).toBe(0);
  });
});

describe("vatOn", () => {
  it("é zero na isenção do art. 53.º (o caso provável da AYAHA)", () => {
    expect(vatOn(3000, 0)).toBe(0);
  });

  it("calcula 23% quando aplicável", () => {
    expect(vatOn(3000, 2300)).toBe(690);
  });
});

describe("formatEUR", () => {
  it("formata em pt-PT com vírgula decimal", () => {
    expect(norm(formatEUR(3000))).toBe("30,00 €");
    expect(norm(formatEUR(1500))).toBe("15,00 €");
    expect(norm(formatEUR(0))).toBe("0,00 €");
  });

  it("não separa milhar em números de 4 dígitos (particularidade do pt-PT)", () => {
    // €1500 sai como "1500,00 €", sem separador. Não é bug do Intl: é a norma
    // portuguesa. Quem construir gráficos ou tabelas tem de contar com isto.
    expect(norm(formatEUR(150_000))).toBe("1500,00 €");
  });

  it("separa milhar a partir de 5 dígitos", () => {
    expect(norm(formatEUR(1_500_000))).toBe("15 000,00 €");
  });

  it("formata negativos (estornos)", () => {
    expect(norm(formatEUR(-1200))).toContain("12,00");
  });
});

describe("formatEURCompact", () => {
  it("esconde cêntimos quando são zero", () => {
    expect(norm(formatEURCompact(3000))).toBe("30 €");
  });

  it("mostra cêntimos quando existem", () => {
    expect(norm(formatEURCompact(3050))).toBe("30,50 €");
  });
});

describe("formatBps", () => {
  it("formata percentagens redondas", () => {
    expect(norm(formatBps(4000))).toBe("40%");
  });

  it("mostra decimais quando precisos", () => {
    expect(norm(formatBps(1250))).toBe("12,5%");
  });
});

describe("parseEUR", () => {
  it("aceita os formatos que uma pessoa escreve", () => {
    expect(parseEUR("30")).toBe(3000);
    expect(parseEUR("30,00")).toBe(3000);
    expect(parseEUR("30.00")).toBe(3000);
    expect(parseEUR("30,00 €")).toBe(3000);
    expect(parseEUR("30 €")).toBe(3000);
  });

  it("interpreta o separador de milhar português", () => {
    expect(parseEUR("1.234,56")).toBe(123_456);
  });

  it("devolve null em vez de atirar quando não percebe", () => {
    expect(parseEUR("abc")).toBeNull();
    expect(parseEUR("")).toBeNull();
  });
});

describe("cenário real: fatura de um atendimento", () => {
  it("aplica recompensa de fidelidade e taxa de deslocação na ordem certa", () => {
    // Volume Russo €30, cliente com recompensa de €15, zona Grande Lisboa €10
    const subtotal = 3000;
    const rewardDiscount = 1500;
    const travelFee = 1000;

    const afterReward = subtractFloor(subtotal, rewardDiscount);
    const total = sumCents(afterReward, travelFee);

    expect(afterReward).toBe(1500);
    expect(total).toBe(2500);
    expect(norm(formatEUR(total))).toBe("25,00 €");
  });

  it("a deslocação continua devida mesmo com o serviço todo descontado", () => {
    const subtotal = 3000;
    const hugeDiscount = 9999;
    const travelFee = 1000;

    const total = sumCents(subtractFloor(subtotal, hugeDiscount), travelFee);
    expect(total).toBe(1000);
  });

  it("a comissão incide sobre o serviço, não sobre a deslocação", () => {
    const serviceRevenue = 3000;
    const travelFee = 1000;
    const commission = applyBps(serviceRevenue, 4000);

    expect(commission).toBe(1200);
    expect(commission).not.toBe(applyBps(serviceRevenue + travelFee, 4000));
  });
});
