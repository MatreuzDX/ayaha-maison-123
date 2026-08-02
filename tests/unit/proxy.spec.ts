import { describe, expect, it } from "vitest";
import { zoneOf } from "@/proxy";

describe("zoneOf", () => {
  it("reconhece as zonas protegidas", () => {
    expect(zoneOf("/app")).toBe("staff");
    expect(zoneOf("/app/agenda")).toBe("staff");
    expect(zoneOf("/conta")).toBe("client");
    expect(zoneOf("/conta/pedidos")).toBe("client");
  });

  it("não confunde /contato com /conta — prefixo de string não chega", () => {
    expect(zoneOf("/contato")).toBe("public");
  });

  it("não confunde outros caminhos que começam por /app ou /conta por acidente", () => {
    expect(zoneOf("/appropriado")).toBe("public");
    expect(zoneOf("/contabilidade")).toBe("public");
  });

  it("deixa as páginas públicas da zona de cliente sem sessão", () => {
    expect(zoneOf("/conta/registar")).toBe("public");
    expect(zoneOf("/conta/completar-perfil")).toBe("public");
  });

  it("tudo o resto é público por omissão", () => {
    expect(zoneOf("/")).toBe("public");
    expect(zoneOf("/servicos")).toBe("public");
    expect(zoneOf("/login")).toBe("public");
  });
});
