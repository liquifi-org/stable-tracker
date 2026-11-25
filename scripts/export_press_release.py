#!/usr/bin/env python3
"""Export the Stablecoin Tracker press release to Word."""

from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

OUT = Path(__file__).resolve().parents[1] / "Stablecoin-Tracker-Press-Release.docx"

INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x55, 0x55, 0x55)
RULE = RGBColor(0xB8, 0xB8, 0xB8)
LINK = RGBColor(0x0B, 0x57, 0xD0)


def set_run(run, *, size=11, bold=False, italic=False, color=INK, font="Calibri"):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color


def shade_cell(cell, fill: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def set_cell_borders(cell):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:color"), "D0D0D0")
        borders.append(el)
    tcPr.append(borders)


def add_hyperlink(paragraph, text: str, url: str, *, size=11, italic=False, bold=False):
    part = paragraph.part
    r_id = part.relate_to(
        url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), r_id)
    new_run = OxmlElement("w:r")
    rPr = OxmlElement("w:rPr")
    rFonts = OxmlElement("w:rFonts")
    rFonts.set(qn("w:ascii"), "Calibri")
    rFonts.set(qn("w:hAnsi"), "Calibri")
    rPr.append(rFonts)
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), str(int(size * 2)))
    rPr.append(sz)
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "0B57D0")
    rPr.append(color)
    u = OxmlElement("w:u")
    u.set(qn("w:val"), "single")
    rPr.append(u)
    if italic:
        i = OxmlElement("w:i")
        rPr.append(i)
    if bold:
        b = OxmlElement("w:b")
        rPr.append(b)
    new_run.append(rPr)
    text_el = OxmlElement("w:t")
    text_el.text = text
    text_el.set(qn("xml:space"), "preserve")
    new_run.append(text_el)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


def para(
    doc,
    text="",
    *,
    size=11,
    bold=False,
    italic=False,
    color=INK,
    space_before=0,
    space_after=10,
    align=WD_ALIGN_PARAGRAPH.LEFT,
    font="Calibri",
):
    p = doc.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
    if text:
        run = p.add_run(text)
        set_run(run, size=size, bold=bold, italic=italic, color=color, font=font)
    return p


def add_mixed(doc, segments, **kwargs):
    """segments: list of str | (text, style_dict) | ('link', text, url, style_dict)."""
    p = para(doc, "", **kwargs)
    for seg in segments:
        if isinstance(seg, str):
            run = p.add_run(seg)
            set_run(run, size=kwargs.get("size", 11), color=kwargs.get("color", INK))
        elif seg[0] == "link":
            _, text, url, *rest = seg
            style = rest[0] if rest else {}
            add_hyperlink(
                p,
                text,
                url,
                size=kwargs.get("size", 11),
                italic=style.get("italic", False),
                bold=style.get("bold", False),
            )
        else:
            text, style = seg
            run = p.add_run(text)
            set_run(
                run,
                size=kwargs.get("size", 11),
                bold=style.get("bold", False),
                italic=style.get("italic", False),
                color=style.get("color", INK),
            )
    return p


def heading(doc, text, *, size=13, space_before=16, space_after=8):
    return para(
        doc,
        text,
        size=size,
        bold=True,
        space_before=space_before,
        space_after=space_after,
    )


def build():
    doc = Document()

    section = doc.sections[0]
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(0.9)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)
    style.font.color.rgb = INK

    para(doc, "FOR IMMEDIATE RELEASE", size=10, bold=True, color=MUTED, space_after=4)
    para(doc, "16 September 2026  ·  Amsterdam", size=10, color=MUTED, space_after=16)

    para(
        doc,
        "Open-source tracker maps stablecoin usage, corridors and live rules by country",
        size=22,
        bold=True,
        space_after=8,
        font="Calibri",
    )
    para(
        doc,
        "EY-Parthenon, FirmShift, Allium, STRIDE and Stablecoin Insider publish a monthly observatory at stabletracker.org. Sibling project to CBDC Tracker. Code is public.",
        size=12,
        italic=True,
        color=MUTED,
        space_after=16,
    )

    add_mixed(
        doc,
        [
            "AMSTERDAM — 16 September 2026 — Circulating supply and the peg tell you about a market. Policy teams and operators still lack a shared, country-level picture of where privately issued stablecoins function as money: which economies show the usage, which international routes carry the value, and which jurisdictions have a live, stablecoin-specific rulebook.",
        ],
        space_after=10,
    )

    add_mixed(
        doc,
        [
            ("link", "Stablecoin Tracker", "https://stabletracker.org"),
            " is live. The open-source observatory, convened by ",
            ("Igor Mikhalev of EY-Parthenon", {"bold": True}),
            ", joins Allium’s attributed on-chain wallet and corridor data to official population, GDP, remittance and services-import series, and to STRIDE’s country-level regulatory taxonomy. Country briefings stack usage, corridor direction and rules on one page. The methodology is public. So is the code.",
        ],
        space_after=10,
    )

    para(
        doc,
        "The contributing organizations are EY, Allium, STRIDE, FirmShift and Stablecoin Insider.",
        space_after=10,
    )

    add_mixed(
        doc,
        [
            ("“This tracker keeps three questions on one map, for one closed month at a time: where stablecoins are used relative to the size of the economy, which international routes carry the value, and whether a live, stablecoin-specific rulebook exists,”", {"italic": True}),
            " said ",
            ("Igor Mikhalev, Partner and Europe West Head of Emerging Technologies Strategy at EY-Parthenon", {"bold": True}),
            ". ",
            ("“If we can name the source and define the number, it ships.”", {"italic": True}),
        ],
        space_after=10,
    )

    add_mixed(
        doc,
        [
            "Mikhalev is also a co-founder of ",
            ("link", "CBDC Tracker", "https://cbdctracker.org"),
            ", the open database of sovereign digital-currency initiatives. The two maps are siblings. CBDC Tracker catalogues what governments are building. Stablecoin Tracker catalogues how private tokens already move value across borders.",
        ],
        space_after=10,
    )

    add_mixed(
        doc,
        [
            "The league table is ",
            ("GDP intensity", {"bold": True}),
            ": outbound international corridor volume divided by period GDP. Wallet counts stay on the table as a people-scale figure. Corridor maps show cross-border pairs, using Allium adjusted volume — exchange hops, DEX noise, infrastructure, MEV and short-term routing stripped. Domestic volume is omitted; the interface states that limit.",
        ],
        space_after=10,
    )

    add_mixed(
        doc,
        [
            ("“Adjusted volume exists because exchange hops, MEV and short-term routing drown the economic signal,”", {"italic": True}),
            " said ",
            ("Ethan Chan, Co-Founder and CEO of Allium", {"bold": True}),
            ". ",
            ("“Country assignment is a model. The tracker sits on the same class of attributed datasets institutions already run in production. Read the geography as the best public estimate we have, and read the holes.”", {"italic": True}),
        ],
        space_after=10,
    )

    para(
        doc,
        "Regulatory stage, licenses and reserve-type permissions come from STRIDE’s Stablecoin Regulation Tracker, which already covers more than 200 jurisdictions. The regulatory view joins observed usage to whether a stablecoin-specific framework is live.",
        space_after=10,
    )

    add_mixed(
        doc,
        [
            ("“A fat corridor into a jurisdiction with no framework is a different operating environment from a thin corridor into MiCA,”", {"italic": True}),
            " said ",
            ("Alexander Feenie, Founder and CEO of STRIDE", {"bold": True}),
            ". ",
            ("“We already publish stage, licenses and reserve-type rules as the law moves. Joining that to observed usage is the layer banks, issuers and compliance teams have been missing. ‘Can you operate there’ and ‘is anyone using it’ are two questions. This product holds both.”", {"italic": True}),
        ],
        space_after=10,
    )

    add_mixed(
        doc,
        [
            "FirmShift is the engineering partner — the same shop that helped keep CBDC Tracker in production as a part-time open-source project. The application, the metric code and the monthly sync jobs are at ",
            ("link", "github.com/liquifi-org/stable-tracker", "https://github.com/liquifi-org/stable-tracker"),
            ".",
        ],
        space_after=10,
    )

    add_mixed(
        doc,
        [
            ("“We built a monthly observatory you can reproduce,”", {"italic": True}),
            " said ",
            ("Alexey Lukashin, Managing Partner of FirmShift", {"bold": True}),
            ". ",
            ("“Allium on the chain, STRIDE on the rules, World Bank on the macro join. Snapshots stay so last month still exists after the next sync. If you disagree with a number, open the repo. Cite the series and the month.”", {"italic": True}),
        ],
        space_after=10,
    )

    add_mixed(
        doc,
        [
            "The methodology paper — ",
            ("Measuring stablecoin usage, corridors, and regulation", {"italic": True}),
            " (v1.4) — is on the site. Key authors are Igor Mikhalev, Tatiana Descamps and Silke van der Burg. It defines every headline metric. Wallets are addresses. Geography is attributed. Official remittance and services series lag corridor volume and measure something else. Coverage follows the sources: silence on a country means the sources are silent.",
        ],
        space_after=10,
    )

    add_mixed(
        doc,
        [
            ("“The story that matters is usage: which corridors look like remittance rails, which look like treasury hops, and which countries have wallets sitting outside a live regime,”", {"italic": True}),
            " said ",
            ("Chiara Munaretto, CEO of Stablecoin Insider", {"bold": True}),
            ". ",
            ("“Operators and reporters have been stitching that together from three tabs. This puts it on one map.”", {"italic": True}),
        ],
        space_after=10,
    )

    para(
        doc,
        "Stablecoin Tracker is free, with no login. The latest selectable period is the previous calendar month. The current month stays open until it closes.",
        space_after=8,
    )

    links = para(doc, "", space_after=4)
    run = links.add_run("Site: ")
    set_run(run, bold=True, size=11)
    add_hyperlink(links, "https://stabletracker.org", "https://stabletracker.org")

    links = para(doc, "", space_after=4)
    run = links.add_run("Whitepaper: ")
    set_run(run, bold=True, size=11)
    add_hyperlink(links, "https://stabletracker.org/whitepaper", "https://stabletracker.org/whitepaper")

    links = para(doc, "", space_after=16)
    run = links.add_run("Source: ")
    set_run(run, bold=True, size=11)
    add_hyperlink(
        links,
        "https://github.com/liquifi-org/stable-tracker",
        "https://github.com/liquifi-org/stable-tracker",
    )

    heading(doc, "About the contributing organizations")

    about = [
        (
            "EY-Parthenon",
            " is the strategy arm of EY. Igor Mikhalev is based in Amsterdam and advises institutions on digital currencies, tokenization and emerging-tech strategy.",
        ),
        (
            "Allium",
            " is the enterprise blockchain-data platform used as a system of record for on-chain finance. It indexes 150+ chains and publishes the attributed wallet and adjusted-volume corridor series behind the tracker.",
        ),
        (
            "STRIDE",
            " builds last-mile stablecoin infrastructure for banks and publishes the Stablecoin Regulation Tracker — licensing, issuance, reserve and supervisory rules across 200+ jurisdictions.",
        ),
        (
            "FirmShift",
            " is an Amsterdam-based software and applied-AI firm. It is the engineering partner on Stablecoin Tracker and a long-running contributor to CBDC Tracker.",
        ),
        (
            "Stablecoin Insider",
            " is an independent journal on the stablecoin ecosystem — regulation, institutional adoption, treasury and cross-border use.",
        ),
    ]
    for name, rest in about:
        add_mixed(doc, [(name, {"bold": True}), rest], space_after=8)

    stride_note = para(doc, "", space_after=16, space_before=0)
    run = stride_note.add_run("STRIDE regulation tracker: ")
    set_run(run, size=10, color=MUTED)
    add_hyperlink(stride_note, "https://tracker.stride.sc", "https://tracker.stride.sc", size=10)

    heading(doc, "Media contacts")
    para(
        doc,
        "Each party should swap in its official press inbox before wire. Quotes above are proposed language for sign-off.",
        size=10,
        italic=True,
        color=MUTED,
        space_after=8,
    )

    rows = [
        ("Organization", "Spokesperson", "Contact"),
        ("EY-Parthenon / project", "Igor Mikhalev", "im@c20.org  ·  stabletracker.org/contact"),
        ("FirmShift", "Alexey Lukashin, Managing Partner", "firmshift.com"),
        ("Allium", "Ethan Chan, Co-Founder & CEO", "allium.so"),
        ("STRIDE", "Alexander Feenie, Founder & CEO", "stride.sc"),
        ("Stablecoin Insider", "Chiara Munaretto, CEO", "stablecoininsider.org"),
    ]
    table = doc.add_table(rows=len(rows), cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    for i, row_data in enumerate(rows):
        row = table.rows[i]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.text = ""
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(3)
            run = p.add_run(val)
            set_run(run, size=10, bold=(i == 0))
            set_cell_borders(cell)
            if i == 0:
                shade_cell(cell, "F2F2F2")

    para(doc, "", space_after=8)

    heading(doc, "Disclaimer")
    para(
        doc,
        "Stablecoin Tracker is an informational observatory. It offers no legal opinion, investment recommendation, or compliance finding on any token, corridor or jurisdiction. Data custody remains with each source. Views in this release are those of the named speakers and do not necessarily represent their firms. EY and EY-Parthenon do not endorse any digital asset.",
        size=10,
        color=MUTED,
        space_after=12,
    )

    para(doc, "— 30 —", size=10, color=MUTED, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=8)

    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
