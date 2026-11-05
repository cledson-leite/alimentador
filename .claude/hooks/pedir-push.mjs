// Hook PreToolUse (Bash/PowerShell): `git push` nunca passa direto, o usuário confirma cada um.
let entrada = "";
process.stdin.on("data", (c) => (entrada += c));
process.stdin.on("end", () => {
  let comando = "";
  try {
    comando = JSON.parse(entrada).tool_input?.command ?? "";
  } catch {
    return;
  }
  if (!/\bgit\b[^;&|\n]*\bpush\b/.test(comando)) return;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: "git push só com ordem explícita do usuário (esteira de desenvolvimento).",
      },
    }),
  );
});
