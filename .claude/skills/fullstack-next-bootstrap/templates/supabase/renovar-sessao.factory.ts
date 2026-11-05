import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL } from "@/env.client";
import { createServerClient } from "@supabase/ssr";

export async function renovarSessao(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesParaSetar) => {
        cookiesParaSetar.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesParaSetar.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() (não getSession()) força a validação do token contra o servidor,
  // que é o que efetivamente renova a sessão quando o access token expirou.
  await supabase.auth.getUser();

  return response;
}
