/**
 * Definição do menu.
 *
 * Vive num módulo SEM `"use client"` de propósito. Exportar dados a partir de
 * um módulo cliente e importá-los num Server Component não funciona: o Next
 * substitui os exports do módulo cliente por referências opacas, e o servidor
 * recebe um proxy em vez do array. O layout precisa do array a sério para
 * filtrar por permissões antes de renderizar.
 */

import type { Permission } from "@/server/permissions";

export type NavIcon =
  | "dashboard"
  | "agenda"
  | "clientes"
  | "atendimentos"
  | "equipa"
  | "servicos"
  | "stock"
  | "financeiro"
  | "marketing"
  | "relatorios"
  | "definicoes";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  permission: Permission;
}

/** Cada item declara a permissão que exige — o servidor filtra antes de enviar. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: "dashboard", permission: "service:read" },
  { href: "/agenda", label: "Agenda", icon: "agenda", permission: "appointment:read" },
  { href: "/clientes", label: "Clientes", icon: "clientes", permission: "client:read" },
  { href: "/atendimentos", label: "Atendimentos", icon: "atendimentos", permission: "appointment:read" },
  { href: "/equipa", label: "Equipa", icon: "equipa", permission: "professional:read" },
  { href: "/servicos", label: "Serviços", icon: "servicos", permission: "service:read" },
  { href: "/stock", label: "Stock", icon: "stock", permission: "inventory:read" },
  { href: "/financeiro", label: "Financeiro", icon: "financeiro", permission: "finance:read" },
  { href: "/marketing", label: "Marketing", icon: "marketing", permission: "marketing:read" },
  { href: "/relatorios", label: "Relatórios", icon: "relatorios", permission: "report:read" },
  { href: "/definicoes", label: "Definições", icon: "definicoes", permission: "settings:write" },
];

/** Destinos da barra inferior em mobile — os cinco mais usados no terreno. */
export const MOBILE_HREFS = ["/", "/agenda", "/clientes", "/atendimentos", "/stock"];
