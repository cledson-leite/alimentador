"""Gera o PDF de resposta à devolutiva no modelo da revisão (ReportLab, A4, títulos azul-marinho).

Uso: python -I gerar_pdf.py <entrada.md> <saida.pdf> --pr 200 --titulo "Resposta à devolutiva 1" \
         --subtitulo "Encerramento automático 23h50 e corte do Dock • head ae3c2f79" \
         --status "F1 E G2 CORRIGIDOS; O1 AGUARDA ACEITE"

Markdown aceito: `## ` seção (H2), `### ` subseção (H3), parágrafos, `- ` itens, tabelas `| a | b |`
(1ª linha = cabeçalho, 2ª = separador), listas `1. `, blocos ``` de código (monoespaçado, linha longa é
quebrada), **negrito**, `código`. Linha `> texto` = nota pequena. `--rotulo` troca o rótulo do topo.
"""
import argparse
import datetime
import re
from pathlib import Path

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, XPreformatted,
)

FONTES = Path(reportlab.__file__).parent / "fonts"
pdfmetrics.registerFont(TTFont("Corpo", str(FONTES / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("Corpo-B", str(FONTES / "VeraBd.ttf")))
pdfmetrics.registerFontFamily("Corpo", normal="Corpo", bold="Corpo-B")

AZUL = colors.HexColor("#1b3a57")
CINZA = colors.HexColor("#5b6b7b")
VERMELHO = colors.HexColor("#a4262c")
FUNDO = colors.HexColor("#eef2f6")
LINHA = colors.HexColor("#d5dce3")

H1 = ParagraphStyle("h1", fontName="Corpo-B", fontSize=26, leading=30, textColor=AZUL, spaceAfter=4)
SUB = ParagraphStyle("sub", fontName="Corpo", fontSize=9.5, leading=13, textColor=CINZA, spaceAfter=14)
STATUS = ParagraphStyle("st", fontName="Corpo-B", fontSize=10, leading=14, textColor=VERMELHO, spaceAfter=6)
H2 = ParagraphStyle("h2", fontName="Corpo-B", fontSize=14, leading=18, textColor=AZUL, spaceBefore=12, spaceAfter=5)
H3 = ParagraphStyle("h3", fontName="Corpo-B", fontSize=11.5, leading=15, textColor=AZUL, spaceBefore=8, spaceAfter=3)
P = ParagraphStyle("p", fontName="Corpo", fontSize=9.2, leading=13.2, alignment=TA_LEFT, spaceAfter=6)
NOTA = ParagraphStyle("n", parent=P, fontSize=8, leading=11, textColor=CINZA)
CODIGO = ParagraphStyle("cod", fontName="Courier", fontSize=7.6, leading=10, backColor=FUNDO, borderPadding=(5, 5, 5, 5), spaceBefore=3, spaceAfter=9, leftIndent=5, rightIndent=5)
CEL = ParagraphStyle("c", fontName="Corpo", fontSize=8, leading=11)
CEL_H = ParagraphStyle("ch", parent=CEL, fontName="Corpo-B")


def inline(t: str) -> str:
    t = t.replace("&", "&amp;").replace("<", "&lt;")
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    return re.sub(r"`(.+?)`", r'<font face="Courier" size="8.2">\1</font>', t)


def tabela(linhas: list[str], largura: float) -> Table:
    celulas = [[c.strip() for c in l.strip().strip("|").split("|")] for l in linhas if not re.match(r"^\s*\|[\s:|-]+\|\s*$", l)]
    dados = [[Paragraph(inline(c), CEL_H if i == 0 else CEL) for c in row] for i, row in enumerate(celulas)]
    n = len(dados[0])
    if n >= 4:  # tabelas de roteiro (#, passo, esperado, OK, obs.): largura proporcional ao conteúdo
        fixas = {"#": 11 * mm, "ok": 10 * mm, "obs.": 30 * mm, "obs": 30 * mm}  # colunas curtas e a de anotação
        fixa = [fixas.get(re.sub(r"[`*]", "", celulas[0][i]).strip().lower()) for i in range(n)]
        pesos = [min(max(len(re.sub(r"[`*]", "", row[i])) for row in celulas if i < len(row)), 46) for i in range(n)]
        livre = sum(p for p, f in zip(pesos, fixa) if f is None) or 1
        sobra = largura - sum(f for f in fixa if f is not None)
        cols = [f if f is not None else sobra * p / livre for p, f in zip(pesos, fixa)]
    else:
        primeira = min(largura * 0.22, 38 * mm) if n > 1 else largura
        cols = [primeira] + [(largura - primeira) / (n - 1)] * (n - 1) if n > 1 else [largura]
    t = Table(dados, colWidths=cols)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FUNDO),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINHA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def montar(md: str, largura: float) -> list:
    fluxo, buf_tab, buf_p = [], [], []

    def fecha_tab():
        if buf_tab:
            fluxo.extend([tabela(buf_tab, largura), Spacer(1, 8)])
            buf_tab.clear()

    def fecha_p():
        if buf_p:
            fluxo.append(Paragraph(inline(" ".join(buf_p)), P))
            buf_p.clear()

    em_codigo, bloco = False, []
    for l in md.splitlines():
        if l.lstrip().startswith("```"):
            fecha_p(); fecha_tab()
            if em_codigo:
                fluxo.append(XPreformatted(re.sub(r"&", "&amp;", "\n".join(bloco)).replace("<", "&lt;"), CODIGO))
                bloco = []
            em_codigo = not em_codigo
            continue
        if em_codigo:
            while len(l) > 100:  # sem rolagem no PDF: quebra a linha longa e marca a continuação
                bloco.append(l[:100] + " \\")
                l = "  " + l[100:]
            bloco.append(l)
            continue
        if l.lstrip().startswith("|"):
            fecha_p(); buf_tab.append(l); continue
        fecha_tab()
        if not l.strip():
            fecha_p()
        elif l.startswith("## "):
            fecha_p(); fluxo.append(Paragraph(inline(l[3:]), H2))
        elif l.startswith("### "):
            fecha_p(); fluxo.append(Paragraph(inline(l[4:]), H3))
        elif l.startswith("> "):
            fecha_p(); fluxo.append(Paragraph(inline(l[2:]), NOTA))
        elif re.match(r"^\d+\. ", l):
            fecha_p(); fluxo.append(Paragraph(inline(l), ParagraphStyle("ol", parent=P, leftIndent=14, firstLineIndent=-14, spaceAfter=3)))
        elif l.startswith("- "):
            fecha_p(); fluxo.append(Paragraph("•&nbsp;&nbsp;" + inline(l[2:]), ParagraphStyle("li", parent=P, leftIndent=12, firstLineIndent=-10, spaceAfter=3)))
        else:
            buf_p.append(l.strip())
    fecha_p(); fecha_tab()
    return fluxo


def main() -> None:
    a = argparse.ArgumentParser()
    a.add_argument("entrada"); a.add_argument("saida")
    a.add_argument("--pr", default=""); a.add_argument("--titulo", required=True)
    a.add_argument("--subtitulo", default=""); a.add_argument("--status", default="")
    a.add_argument("--rotulo", default="")  # rótulo do topo; padrão "PR #n" ou "Release"
    a.add_argument("--tipo", default="resposta técnica")  # rodapé e título do PDF, ex.: "revisão profunda"
    arg = a.parse_args()
    data = datetime.date.today().strftime("%d/%m/%Y")
    rotulo = arg.rotulo or (f"PR #{arg.pr}" if arg.pr else "Release")
    rodape = f"{Path.cwd().name.upper()} | {rotulo} / {arg.tipo} | {data}"

    def pagina(c, doc):
        c.saveState()
        c.setStrokeColor(LINHA); c.line(20 * mm, 17 * mm, A4[0] - 20 * mm, 17 * mm)
        c.setFont("Corpo", 7.5); c.setFillColor(CINZA)
        c.drawString(20 * mm, 12 * mm, rodape); c.drawRightString(A4[0] - 20 * mm, 12 * mm, str(doc.page))
        if doc.page > 1:
            c.drawString(20 * mm, A4[1] - 12 * mm, arg.tipo.upper())
        c.restoreState()

    doc = BaseDocTemplate(arg.saida, pagesize=A4, title=f"{rotulo} / {arg.tipo}", author="Desenvolvimento",
                          leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=22 * mm)
    larg = A4[0] - 40 * mm
    doc.addPageTemplates([PageTemplate(id="p", frames=[Frame(20 * mm, 22 * mm, larg, A4[1] - 42 * mm, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=pagina)])
    topo = [Paragraph(rotulo, H1), Paragraph(inline(arg.titulo), H1)]
    if arg.subtitulo:
        topo.append(Paragraph(inline(arg.subtitulo), SUB))
    if arg.status:
        topo.append(Paragraph(inline(arg.status), STATUS))
    doc.build(topo + montar(Path(arg.entrada).read_text(encoding="utf-8"), larg))
    print(arg.saida)


if __name__ == "__main__":
    main()
