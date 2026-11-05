"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Mecanismo obrigatório de troca de tema (docs/arquitetura.md §5.2). Light é o
// padrão do produto; enableSystem fica desligado para não sobrepor essa
// decisão com a preferência de SO do visitante.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      themes={["dark", "light"]}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
