/**
 * Erros da aplicação.
 *
 * Regra: a `message` é sempre em pt-PT e sempre acionável. Não "Erro ao gravar",
 * mas "Não é possível marcar às 11:45 — a Sofia precisa de 38 min para vir de
 * Cascais e só tem 20". Quem lê a mensagem tem de saber o que fazer a seguir.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ForbiddenError extends AppError {
  constructor(permission?: string) {
    super(
      "FORBIDDEN",
      permission
        ? `Não tem permissão para "${permission}".`
        : "Não tem permissão para esta ação.",
      403,
      { permission },
    );
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("UNAUTHORIZED", "Sessão inválida ou expirada. Volte a entrar.", 401);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends AppError {
  constructor(what = "registo") {
    super("NOT_FOUND", `${what} não encontrado.`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION", message, 422, details);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, 409, details);
    this.name = "ConflictError";
  }
}

/** Resultado serializável para APIs e Server Actions. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export function toActionError(err: unknown): ActionResult<never> {
  if (err instanceof AppError) {
    return {
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
  }
  // Nunca expor detalhes internos ao cliente — podem conter dados ou estrutura da BD.
  console.error("[unhandled]", err);
  return {
    ok: false,
    error: {
      code: "INTERNAL",
      message: "Ocorreu um erro inesperado. Tente novamente.",
    },
  };
}
