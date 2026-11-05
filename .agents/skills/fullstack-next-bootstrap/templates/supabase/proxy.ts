import type { NextRequest } from "next/server";

import { renovarSessao } from "@/main/renovar-sessao.factory";

export function proxy(request: NextRequest) {
  return renovarSessao(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
