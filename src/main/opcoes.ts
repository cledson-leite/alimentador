import { parseArgs } from "node:util";

export type Opcoes = {
  dryRun: boolean;
  producao: boolean;
  permitirApi: boolean;
  semOcr: boolean;
  regimes: string;
  ocrCache: string;
  cnpjs: string[] | undefined;
  lista: string;
  sn: string;
  tributario: string;
  documentos: string;
  saida: string;
};

const DOWNLOADS = "C:/Users/csbet/Downloads";

export function lerOpcoes(argv: string[]): Opcoes {
  const { values } = parseArgs({
    args: argv,
    options: {
      "dry-run": { type: "boolean", default: false },
      producao: { type: "boolean", default: false },
      "permitir-api": { type: "boolean", default: false },
      "sem-ocr": { type: "boolean", default: false },
      regimes: { type: "string", default: "C:/dados/sem-regime-prontas-para-confirmar.csv" },
      "ocr-cache": { type: "string", default: "C:/dados/ocr-cache" },
      cnpj: { type: "string" },
      lista: { type: "string", default: `${DOWNLOADS}/lista empresas(4).xlsx` },
      sn: { type: "string", default: `${DOWNLOADS}/CONTROLE SIMPLES NACIONAL .xlsx` },
      tributario: { type: "string", default: `${DOWNLOADS}/TRIBUTARIO EMPRESAS.xlsx` },
      documentos: { type: "string", default: "C:/dados/drive-contratos" },
      saida: { type: "string", default: "saida" },
    },
    strict: true,
  });
  const cnpjs = values.cnpj?.split(",").map((c) => c.replace(/\D/g, ""));
  if (cnpjs?.some((c) => c.length !== 14)) throw new Error("--cnpj aceita só CNPJs de 14 dígitos, separados por vírgula.");
  return {
    dryRun: values["dry-run"],
    producao: values.producao,
    permitirApi: values["permitir-api"],
    semOcr: values["sem-ocr"],
    regimes: values.regimes,
    ocrCache: values["ocr-cache"],
    cnpjs,
    lista: values.lista,
    sn: values.sn,
    tributario: values.tributario,
    documentos: values.documentos,
    saida: values.saida,
  };
}
