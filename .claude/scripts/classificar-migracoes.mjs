// Classifica as migrations locais pelo que a produção já aplicou (só leitura).
// Uso: node .claude/scripts/classificar-migracoes.mjs <arquivo-com-a-resposta-do-sql> [pasta, padrão supabase/migrations]
// A resposta do SQL pode vir em qualquer formato (tabela, CSV, JSON): vale todo número de 14 dígitos.
//   select version from supabase_migrations.schema_migrations order by version;
import { readdirSync, readFileSync } from "node:fs";

const [arquivo, pasta = "supabase/migrations"] = process.argv.slice(2);
if (!arquivo) {
  console.error("uso: node .claude/scripts/classificar-migracoes.mjs <arquivo-com-a-resposta> [pasta]");
  process.exit(1);
}

const producao = new Set(readFileSync(arquivo, "utf8").match(/\b\d{14}\b/g) ?? []);
if (!producao.size) {
  console.error("nenhuma versão de 14 dígitos na resposta: nada será consolidado");
  process.exit(2);
}
const locais = readdirSync(pasta)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({ versao: f.slice(0, 14), arquivo: f }))
  .sort((a, b) => a.versao.localeCompare(b.versao));
const locaisSet = new Set(locais.map((m) => m.versao));
const ultima = [...producao].sort().at(-1);

const congeladas = locais.filter((m) => producao.has(m.versao));
const candidatas = locais.filter((m) => !producao.has(m.versao));
const soProducao = [...producao].filter((v) => !locaisSet.has(v)).sort();
const antesDaUltima = candidatas.filter((m) => m.versao < ultima);

const bloco = (titulo, itens) => console.log(`\n${titulo} (${itens.length})\n${itens.map((i) => `  ${i}`).join("\n") || "  -"}`);
console.log(`última versão em produção: ${ultima}`);
bloco("CONGELADAS: já em produção, não editar nem renomear", congeladas.map((m) => m.arquivo));
bloco("CANDIDATAS: só locais, podem ser consolidadas", candidatas.map((m) => m.arquivo));
bloco("RENUMERAR: candidatas com timestamp anterior à última de produção", antesDaUltima.map((m) => m.arquivo));
bloco("DIVERGÊNCIA: em produção e ausentes do repositório (não consolidar até entender)", soProducao);
console.log(`\nnovas migrations consolidadas devem ter versão > ${ultima}`);
process.exit(soProducao.length ? 3 : 0);
