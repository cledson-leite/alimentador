import { agruparPorCnpj, chaveTelefone, cnpjsDoArquivoDeResponsavel, emailDoNomeDoArquivo, formaDoCliente, lerLinha } from "./contato";

const CNPJ = "38.034.594/0001-24";

describe("lerLinha", () => {
  it("WHATS com telefone vira um contato de WhatsApp, com o 9 que falta no celular", () => {
    const l = lerLinha(1, ["123E LIVE LTDA", CNPJ, "EDUARDO", "WHATS", "45 9973-8126", null])!;
    expect(l.cnpj).toBe("38034594000124");
    expect(l.contatos).toEqual([{ nome: "EDUARDO", telefone: "(45) 99973-8126", email: undefined, canal: "whatsapp" }]);
  });

  it("EMAIL vira contato de e-mail; o prefixo 'email ' digitado na célula é descartado", () => {
    const l = lerLinha(1, ["X", CNPJ, "ANDRE", "EMAIL", null, "email Perola@Hotmail.com"])!;
    expect(l.contatos).toEqual([{ nome: "ANDRE", telefone: undefined, email: "perola@hotmail.com", canal: "email" }]);
  });

  it("duas pessoas e dois telefones na mesma linha viram dois contatos", () => {
    const l = lerLinha(1, ["X", CNPJ, "OLI // LU BUCIOLLI", "WHATS", "45 9911-3459 // 45 8431-6183", null])!;
    expect(l.contatos.map((c) => [c.nome, c.telefone])).toEqual([
      ["OLI", "(45) 99911-3459"],
      ["LU BUCIOLLI", "(45) 98431-6183"],
    ]);
  });

  it("'SETOR// PESSOA' com um telefone é um contato só, e o erro de digitação FINACEIRO é corrigido", () => {
    const l = lerLinha(1, ["X", CNPJ, "FINACEIRO// MYLENA", "WHATS", "45 9922-0665", null])!;
    expect(l.contatos.map((c) => c.nome)).toEqual(["MYLENA (FINANCEIRO)"]);
  });

  it("o canal vem dos dados, não da coluna forma: ACESSÓRIAS só com e-mail é e-mail; WhatsApp e e-mail juntos são os dois", () => {
    expect(lerLinha(1, ["X", CNPJ, "NIRA", "ACESSORIAS", null, "nira@gmail.com"])!.contatos[0]!.canal).toBe("email");
    expect(lerLinha(1, ["X", CNPJ, "ANA", "WHATS", "45 9973-8126", "ana@x.com"])!.contatos[0]!.canal).toBe("whatsapp_e_email");
    expect(lerLinha(1, ["X", CNPJ, "ANA", null, "45 9973-8126", null])!.contatos[0]!.canal).toBe("whatsapp");
  });

  it("sem nome e com e-mail, o nome sai do e-mail e fica marcado", () => {
    const l = lerLinha(1, ["X", CNPJ, null, "EMAIL", null, "financeiro@x.com.br"])!;
    expect(l.contatos).toEqual([expect.objectContaining({ nome: "FINANCEIRO", nomeDerivado: true, canal: "email" })]);
  });

  it("sem WhatsApp nem e-mail não gera contato e deixa aviso", () => {
    const l = lerLinha(1, ["X", CNPJ, "MARCOS", "ACESSORIOS", null, null])!;
    expect(l.contatos).toEqual([]);
    expect(l.avisos).toEqual(["sem WhatsApp nem e-mail: MARCOS"]);
  });

  it("linha só com empresa e CNPJ não gera contato nem aviso", () => {
    const l = lerLinha(1, ["X", CNPJ, null, null, null, null])!;
    expect(l.contatos).toEqual([]);
    expect(l.avisos).toEqual([]);
  });

  it("CNPJ inválido não gera contato", () => {
    expect(lerLinha(1, ["X", "11.111.111/1111-11", "A", "WHATS", "45 9973-8126", null])!.avisos[0]).toMatch(/CNPJ inválido/);
  });

  it("telefone sem DDD é descartado com aviso", () => {
    const l = lerLinha(1, ["X", CNPJ, "A", "WHATS", "9973-8126", null])!;
    expect(l.contatos).toEqual([]);
    expect(l.avisos[0]).toMatch(/telefone inválido/);
  });
});

describe("agruparPorCnpj", () => {
  it("junta as linhas do mesmo CNPJ (mais de um contato) e tira o contato repetido", () => {
    const a = lerLinha(1, ["X", CNPJ, "ANA", "WHATS", "45 9973-8126", null])!;
    const b = lerLinha(2, ["X", CNPJ, "BIA", "WHATS", "45 9911-0000", null])!;
    const repetida = lerLinha(3, ["X", CNPJ, "ANA", "WHATS", "(45) 99973-8126", null])!;
    const [g] = agruparPorCnpj([a, b, repetida]);
    expect(g!.contatos.map((c) => c.nome)).toEqual(["ANA", "BIA"]);
  });
});

describe("formaDoCliente", () => {
  it("WhatsApp e e-mail entre os contatos dão whatsapp_e_email", () => {
    expect(formaDoCliente([{ nome: "A", canal: "whatsapp" }, { nome: "B", canal: "email" }])).toBe("whatsapp_e_email");
    expect(formaDoCliente([{ nome: "A", canal: "whatsapp" }])).toBe("whatsapp");
    expect(formaDoCliente([{ nome: "A" }])).toBeUndefined();
  });
});

describe("responsáveis", () => {
  it("pega o primeiro CNPJ das 4 primeiras colunas e tira repetidos", () => {
    const linhas = [["EMPRESA", "CNPJ"], ["A", "SERV", "ENTREGUE", "47.324.761/0001-62"], ["B", "07.859.686/0001-10", 1], ["B", "07.859.686/0001-10"]];
    expect(cnpjsDoArquivoDeResponsavel(linhas)).toEqual(["47324761000162", "07859686000110"]);
  });

  it("o nome do arquivo é o e-mail do perfil", () => {
    expect(emailDoNomeDoArquivo("C:\\Users\\x\\Downloads\\LentzGabrielly@gmail.com.xlsx")).toBe("lentzgabrielly@gmail.com");
    expect(emailDoNomeDoArquivo("PROVIDENCIAR .xlsx")).toBeUndefined();
  });

  it("chaveTelefone tira o 55 e ignora número sem DDD", () => {
    expect(chaveTelefone("+55 45 99973-8126")).toBe("45999738126");
    expect(chaveTelefone("9973-8126")).toBeUndefined();
  });
});
