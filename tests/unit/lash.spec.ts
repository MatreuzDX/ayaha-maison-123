import { describe, expect, it } from "vitest";
import {
  MAPPING_PRESETS,
  ZONE_COUNT,
  ZONE_LABELS,
  formatLength,
  formatThickness,
  maxSafeLength,
  suggestLengths,
  unsafeZones,
} from "@/lib/lash";

describe("formatThickness", () => {
  it("converte mícrones para milímetros com vírgula", () => {
    // A espessura é guardada em inteiros para nunca haver 0,14999999.
    expect(formatThickness(150)).toBe("0,15 mm");
    expect(formatThickness(70)).toBe("0,07 mm");
    expect(formatThickness(200)).toBe("0,20 mm");
  });

  it("mantém duas casas mesmo em valores redondos", () => {
    expect(formatThickness(100)).toBe("0,10 mm");
  });
});

describe("formatLength", () => {
  it("acrescenta a unidade", () => {
    expect(formatLength(11)).toBe("11 mm");
  });
});

describe("maxSafeLength", () => {
  it("aplica a regra do dobro conforme a resistência da pestana", () => {
    // Pestana natural de 10 mm: uma pestana forte aguenta mais peso.
    expect(maxSafeLength(10, "LOW")).toBe(15);
    expect(maxSafeLength(10, "MEDIUM")).toBe(18);
    expect(maxSafeLength(10, "HIGH")).toBe(22);
  });

  it("assume resistência média quando não se sabe", () => {
    expect(maxSafeLength(10, null)).toBe(18);
  });

  it("devolve null sem comprimento natural — não inventa um limite", () => {
    // Um limite inventado seria pior do que nenhum: daria falsa segurança.
    expect(maxSafeLength(null, "HIGH")).toBeNull();
  });

  it("arredonda para baixo, nunca para cima", () => {
    // 9 × 1,8 = 16,2 → 16. Arredondar para cima autorizaria peso a mais.
    expect(maxSafeLength(9, "MEDIUM")).toBe(16);
  });
});

describe("unsafeZones", () => {
  it("aponta as zonas acima do limite, em posições 1-based", () => {
    expect(unsafeZones([9, 10, 12, 14, 16], 12)).toEqual([4, 5]);
  });

  it("não assinala nada quando está tudo dentro do limite", () => {
    expect(unsafeZones([9, 10, 11, 11, 10], 12)).toEqual([]);
  });

  it("não assinala nada sem limite conhecido", () => {
    expect(unsafeZones([9, 20, 30], null)).toEqual([]);
  });

  it("o valor exato do limite é seguro", () => {
    expect(unsafeZones([12], 12)).toEqual([]);
  });
});

describe("suggestLengths", () => {
  it("devolve um comprimento por zona", () => {
    expect(suggestLengths(0.5, 8, 13)).toHaveLength(ZONE_COUNT);
  });

  it("Fox Eyes cresce até ao canto externo", () => {
    const fox = MAPPING_PRESETS.find((p) => p.name === "Fox Eyes")!;
    const lengths = suggestLengths(fox.peak, 8, 13);

    expect(lengths[ZONE_COUNT - 1]).toBe(13);
    expect(lengths[0]).toBeLessThan(lengths[ZONE_COUNT - 1]!);
    // Cresce sempre, sem descer pelo meio.
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]!);
    }
  });

  it("Doll Eye tem o máximo ao centro", () => {
    const doll = MAPPING_PRESETS.find((p) => p.name === "Doll Eye")!;
    const lengths = suggestLengths(doll.peak, 8, 13);

    const centre = Math.floor(ZONE_COUNT / 2);
    expect(lengths[centre]).toBe(Math.max(...lengths));
    expect(lengths[0]).toBeLessThan(lengths[centre]!);
    expect(lengths[ZONE_COUNT - 1]).toBeLessThan(lengths[centre]!);
  });

  it("nunca sai do intervalo pedido", () => {
    for (const preset of MAPPING_PRESETS) {
      const lengths = suggestLengths(preset.peak, 8, 13);
      for (const mm of lengths) {
        expect(mm).toBeGreaterThanOrEqual(8);
        expect(mm).toBeLessThanOrEqual(13);
      }
    }
  });

  it("devolve inteiros — não há pestanas de 10,5 mm no estojo", () => {
    for (const mm of suggestLengths(0.7, 9, 14)) {
      expect(Number.isInteger(mm)).toBe(true);
    }
  });
});

describe("configuração das zonas", () => {
  it("há uma etiqueta por zona", () => {
    expect(ZONE_LABELS).toHaveLength(ZONE_COUNT);
  });

  it("a primeira zona é o canto interno e a última o externo", () => {
    // A ordem é a base de todo o diagrama: inverter trocaria o Fox Eye pelo
    // seu espelho e a aplicação sairia ao contrário.
    expect(ZONE_LABELS[0]).toBe("Canto interno");
    expect(ZONE_LABELS[ZONE_COUNT - 1]).toBe("Canto externo");
  });
});
