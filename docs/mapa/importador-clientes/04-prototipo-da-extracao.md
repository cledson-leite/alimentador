# 04 Protótipo da extração (letra A local)

Tipo: `wayfinder:prototype` (HITL) · Estado: **fechado**

## Question

Usando a cópia local da letra A (`Desktop\contratos\A`, 119 pastas de empresa), um script descartável com `unpdf` + `mammoth` consegue, com que taxa, classificar, numerar, datar e identificar os documentos? Qual fração não tem camada de texto? Isso decide se OCR entra no destino.

## Resolução

Protótipo descartável (fora do repo, no scratchpad; só números agregados aqui, nenhum dado de cliente).

**Veredito: OCR entra no escopo.** Leitura só de texto digital quase não carrega ninguém.

| Medida (letra A) | Resultado |
|---|---|
| Pastas de empresa | 119 |
| Sem subpasta de contrato **e** sem arquivo solto (só alvará, certidões etc.) | 66 (55%) |
| Arquivos candidatos (PDF 366, .doc 22, .docx 3) | 391 |
| PDFs sem camada de texto (escaneados) | 226 (58%), em 46 empresas, 361 páginas, ~317 MB |
| Documentos com **título real** de contrato/alteração e texto digital | 9, em 7 empresas (6%) |
| Linha de data "Cidade, UF, dia mês por extenso e ano" achada nesses 9 | 0 |
| Imagens soltas nas pastas (`.jpg/.jpeg` 89, `.png` 7, `.tif` 1) e `.txt` 27 | contam como candidatas (imagem é válida; `.txt` não) |

Achados que mudam regras:
- Pasta cujo nome contém só "contrato" pega o **contrato de prestação de serviço do escritório** (`PROCURAÇÃO E CONTRATO DE PRESTAÇÃO DE SERVIÇO`). O filtro de pasta precisa ser "contrato social" / "alteração", e o **conteúdo** decide.
- Classificar por "tem a palavra alteração" não serve: páginas de portal (Empresa Fácil, protocolo, guia de pagamento) também a contêm. O título nas primeiras linhas é o que vale.
- Documentos "outro" encontrados (Correios, DANFE, cartão CNPJ, certificados, QR de assinatura) confirmam que ignorar o que não é contrato é necessário.

**Medição de OCR local (Tesseract, português, 216 dpi, 6 documentos escaneados reais, 11 páginas):**
- 3,2 s por página (uma só thread).
- Confiança média de 88 a 95% nas primeiras páginas (título legível em 5 de 6 documentos); de 51 a 88% nas últimas páginas, onde ficam carimbos e assinaturas.
- A linha de data por extenso foi reconhecida em **0 de 6** últimas páginas. OCR sozinho não resolve a data.

**Cálculo de custo e eficiência** (volume estimado: 3,0 páginas escaneadas por pasta na letra A → ~1.640 páginas de PDF para as 539 empresas SN, mais até ~440 imagens soltas = **~2.100 páginas**, teto):

| Opção | Custo | Tempo | Qualidade |
|---|---|---|---|
| Tesseract local | US$ 0 | ~1,9 h numa thread; menos de 30 min com 4 | PDF final igual ao original (imagem mantida + camada de texto). Data/número falham sem releitura |
| Sonnet 5.5 (US$ 2/M entrada, US$ 10/M saída), esforço médio, todas as páginas | ~US$ 45 (faixa 30–70); ~US$ 22 em lote | minutos a ~1 h com paralelismo | Transcreve bem, mas refazer o PDF muda a formatação e o modelo pode "corrigir" erros sem avisar |
| **Híbrido**: Tesseract em tudo; Sonnet 5.5 só como segunda leitura de data, número e CNPJ nas páginas de baixa confiança | ~US$ 8–20 | Tesseract + chamadas pontuais | PDF idêntico ao original; campo só vale quando as duas leituras concordam |

Premissas do custo do Sonnet 5.5: ~2.000 tokens de entrada por página (imagem + instrução) e ~1.700 de saída (transcrição + raciocínio de esforço médio) ≈ US$ 0,021 por página. São estimativas, não medições: nenhuma chamada à API foi feita.

Recomendação (decisão no ticket 06): híbrido.
