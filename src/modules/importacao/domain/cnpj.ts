export function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = [...cnpj.slice(0, n)].reduce((s, d, i) => s + Number(d) * pesos[i]!, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digito(12) === Number(cnpj[12]) && digito(13) === Number(cnpj[13]);
}
