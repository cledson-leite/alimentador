import { pastasDoManifesto } from "./documentos.manifesto";

const entrada = (empresa: string, id: string, path: string) => ({ letra: "A", empresa, id, path });

describe("pastasDoManifesto", () => {
  it("liga cada arquivo à empresa pelo manifesto (não pelo caminho), mesmo com '/' no nome da pasta", () => {
    const indice = new Map([["ABCDEF", "C:/docs/A/emp/cs__ABCDEF.pdf"]]);
    const manifesto = [
      entrada("EMP LTDA - inicia na Rigoni em 22/01/2026", "ABCDEF123", "A/EMP LTDA - inicia na Rigoni em 22/01/2026/0 CS/contrato social.pdf"),
    ];

    expect(pastasDoManifesto(manifesto, indice)).toEqual([
      {
        nome: "EMP LTDA - inicia na Rigoni em 22/01/2026",
        arquivos: [
          { id: "ABCDEF123", nome: "contrato social.pdf", formato: "pdf", caminho: "C:/docs/A/emp/cs__ABCDEF.pdf" },
        ],
      },
    ]);
  });

  it("ignora arquivo ausente do disco, formato desconhecido, alvará, modelos em branco e duplicata do mesmo id", () => {
    const indice = new Map([
      ["AAAAAA", "C:/x/a.pdf"],
      ["BBBBBB", "C:/x/b.xlsx"],
      ["CCCCCC", "C:/x/c.pdf"],
      ["EEEEEE", "C:/x/e.pdf"],
    ]);
    const manifesto = [
      entrada("EMP", "AAAAAA1", "A/EMP/contrato.pdf"),
      entrada("EMP", "AAAAAA1", "A/EMP/contrato.pdf"),
      entrada("EMP", "BBBBBB1", "A/EMP/planilha.xlsx"),
      entrada("EMP", "CCCCCC1", "A/EMP/ALVARÁ/alteracao.pdf"),
      entrada("EMP", "DDDDDD1", "A/EMP/removido.pdf"),
      entrada("EMP", "EEEEEE1", "A/EMP/MODELOS UTILIZADOS/contrato.pdf"),
    ];

    const [pasta] = pastasDoManifesto(manifesto, indice);

    expect(pasta!.arquivos.map((a) => a.id)).toEqual(["AAAAAA1"]);
  });

  it("classifica os formatos pela extensão", () => {
    const indice = new Map([
      ["000001", "C:/x/1.doc"],
      ["000002", "C:/x/2.DOCX"],
      ["000003", "C:/x/3.jpg"],
    ]);
    const manifesto = [
      entrada("EMP", "0000011", "A/EMP/a.doc"),
      entrada("EMP", "0000021", "A/EMP/b.DOCX"),
      entrada("EMP", "0000031", "A/EMP/c.jpg"),
    ];

    const [pasta] = pastasDoManifesto(manifesto, indice);

    expect(pasta!.arquivos.map((a) => a.formato)).toEqual(["doc", "docx", "imagem"]);
  });
});
