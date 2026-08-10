"""EPUB / PDF / Fountain / FDX exporters — local, no cloud."""

from __future__ import annotations

import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from engine.vault.frontmatter import parse_markdown


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _project_title(project_dir: Path) -> str:
    md = project_dir / "project.md"
    if md.exists():
        meta, _ = parse_markdown(md.read_text(encoding="utf-8"))
        return str(meta.get("title") or project_dir.name)
    return project_dir.name


def _module(project_dir: Path) -> str:
    md = project_dir / "project.md"
    if md.exists():
        meta, _ = parse_markdown(md.read_text(encoding="utf-8"))
        return str(meta.get("module") or "draft")
    return "draft"


def _gather_bodies(project_dir: Path) -> list[tuple[str, str]]:
    """Collect (title, body) from hierarchy content/*.md."""
    out: list[tuple[str, str]] = []
    books = project_dir / "books"
    if books.is_dir():
        for book in sorted(books.iterdir()):
            folders = book / "folders"
            if not folders.is_dir():
                continue
            for folder in sorted(folders.iterdir()):
                content = folder / "content"
                if not content.is_dir():
                    continue
                for path in sorted(content.glob("*.md")):
                    meta, body = parse_markdown(path.read_text(encoding="utf-8"))
                    if meta.get("archived"):
                        continue
                    title = str(meta.get("title") or path.stem)
                    out.append((title, body))
    legacy = project_dir / "content"
    if legacy.is_dir():
        for path in sorted(legacy.glob("*.md")):
            meta, body = parse_markdown(path.read_text(encoding="utf-8"))
            if meta.get("archived"):
                continue
            out.append((str(meta.get("title") or path.stem), body))
    return out


def _as_fountain(parts: list[tuple[str, str]], title: str) -> str:
    lines = [f"Title: {title}", f"Draft date: {_utc_stamp()}", ""]
    for t, body in parts:
        lines.append(f"\n# {t}\n")
        lines.append(body.rstrip())
        lines.append("")
    return "\n".join(lines).strip() + "\n"


_SCENE_HEADING = re.compile(
    r"^(?:\.(?=\S)|(?:INT|EXT|EST|I/E|INT/EXT|EXT/INT)\.?(?:/EXT\.?)?\s)",
    re.IGNORECASE,
)
_CHARACTER = re.compile(r"^[A-Z0-9][A-Z0-9 .'\-()#]+$")
_TRANSITION = re.compile(r"^(?:FADE (?:IN|OUT)|CUT TO|DISSOLVE TO|SMASH CUT TO|MATCH CUT TO):?$")


def _fountain_elements(title: str, body: str) -> list[tuple[str, str]]:
    """Parse the Fountain subset needed for structurally correct FDX output."""
    elements: list[tuple[str, str]] = []
    previous = ""
    dialogue_open = False
    lines = body.splitlines()

    if title.strip() and _SCENE_HEADING.match(title.strip()) and (
        not lines or not _SCENE_HEADING.match(lines[0].strip())
    ):
        elements.append(("Scene Heading", title.strip().lstrip(".")))

    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            dialogue_open = False
            previous = ""
            continue

        if stripped.startswith("!") and len(stripped) > 1:
            kind, text = "Action", stripped[1:].lstrip()
        elif stripped.startswith(".") and len(stripped) > 1:
            kind, text = "Scene Heading", stripped[1:].lstrip()
            dialogue_open = False
        elif _SCENE_HEADING.match(stripped):
            kind, text = "Scene Heading", stripped
            dialogue_open = False
        elif stripped.startswith(">") and stripped.endswith("<") and len(stripped) > 2:
            kind, text = "General", stripped[1:-1].strip()
            dialogue_open = False
        elif stripped.startswith(">") or _TRANSITION.fullmatch(stripped.upper()):
            kind, text = "Transition", stripped.strip(">").strip()
            dialogue_open = False
        elif stripped.startswith("@") and len(stripped) > 1:
            kind, text = "Character", stripped[1:].strip()
            dialogue_open = True
        elif (
            len(stripped) <= 48
            and stripped == stripped.upper()
            and _CHARACTER.fullmatch(stripped)
            and not stripped.endswith(".")
        ):
            kind, text = "Character", stripped
            dialogue_open = True
        elif stripped.startswith("(") and stripped.endswith(")") and (
            dialogue_open or previous in {"Character", "Parenthetical", "Dialogue"}
        ):
            kind, text = "Parenthetical", stripped
            dialogue_open = True
        elif dialogue_open and previous in {"Character", "Parenthetical", "Dialogue"}:
            kind, text = "Dialogue", stripped
            dialogue_open = True
        elif stripped.startswith("~") and len(stripped) > 1:
            kind, text = "Lyrics", stripped[1:].lstrip()
            dialogue_open = False
        else:
            kind, text = "Action", stripped.lstrip("!")
            dialogue_open = False

        elements.append((kind, text))
        previous = kind
    return elements


def _as_fdx(parts: list[tuple[str, str]], title: str) -> str:
    paras = [
        f'    <Paragraph Type="{kind}"><Text>{escape(text)}</Text></Paragraph>'
        for part_title, body in parts
        for kind, text in _fountain_elements(part_title, body)
    ]
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n'
        '<FinalDraft DocumentType="Script" Template="No" Version="1">\n'
        "  <TitlePage>\n"
        "    <Content>\n"
        f'      <Paragraph Type="Title"><Text>{escape(title)}</Text></Paragraph>\n'
        "    </Content>\n"
        "  </TitlePage>\n"
        "  <Content>\n"
        + "\n".join(paras)
        + "\n  </Content>\n</FinalDraft>\n"
    )


def _as_epub(parts: list[tuple[str, str]], title: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr(
            "META-INF/container.xml",
            '<?xml version="1.0"?>\n'
            '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
            "  <rootfiles>\n"
            '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n'
            "  </rootfiles>\n"
            "</container>\n",
        )
        spine = []
        manifest = [
            '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
        ]
        for i, (t, body) in enumerate(parts, start=1):
            href = f"chap{i}.xhtml"
            manifest.append(f'<item id="c{i}" href="{href}" media-type="application/xhtml+xml"/>')
            spine.append(f'<itemref idref="c{i}"/>')
            paras = "".join(f"<p>{escape(line)}</p>\n" for line in body.splitlines() if line.strip())
            zf.writestr(
                f"OEBPS/{href}",
                '<?xml version="1.0" encoding="UTF-8"?>\n'
                '<html xmlns="http://www.w3.org/1999/xhtml">\n'
                f"<head><title>{escape(t)}</title></head>\n"
                f"<body><h1>{escape(t)}</h1>\n{paras}</body></html>\n",
            )
        if not parts:
            manifest.append('<item id="c1" href="chap1.xhtml" media-type="application/xhtml+xml"/>')
            spine.append('<itemref idref="c1"/>')
            zf.writestr(
                "OEBPS/chap1.xhtml",
                '<?xml version="1.0" encoding="UTF-8"?>\n'
                '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Empty</title></head>'
                "<body><p>(empty)</p></body></html>\n",
            )
        zf.writestr(
            "OEBPS/content.opf",
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="2.0">\n'
            "  <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n"
            f"    <dc:title>{escape(title)}</dc:title>\n"
            f'    <dc:identifier id="uid">storyworks-{_utc_stamp()}</dc:identifier>\n'
            "    <dc:language>en</dc:language>\n"
            "  </metadata>\n"
            f"  <manifest>\n    " + "\n    ".join(manifest) + "\n  </manifest>\n"
            f"  <spine toc=\"ncx\">\n    " + "\n    ".join(spine) + "\n  </spine>\n"
            "</package>\n",
        )
        nav = "\n".join(
            f'<navPoint id="n{i}" playOrder="{i}"><navLabel><text>{escape(t)}</text></navLabel>'
            f'<content src="chap{i}.xhtml"/></navPoint>'
            for i, (t, _) in enumerate(parts or [("Empty", "")], start=1)
        )
        zf.writestr(
            "OEBPS/toc.ncx",
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n'
            f"<docTitle><text>{escape(title)}</text></docTitle>\n"
            f"<navMap>{nav}</navMap>\n</ncx>\n",
        )
    return buf.getvalue()


def _as_pdf(parts: list[tuple[str, str]], title: str) -> bytes:
    """Paginated Unicode PDF using a macOS system TrueType font."""
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
    )

    font_candidates = (
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
        Path("/System/Library/Fonts/SFNS.ttf"),
    )
    font_path = next((path for path in font_candidates if path.is_file()), None)
    if font_path is None:
        raise RuntimeError("No supported macOS Unicode font found for PDF export")

    font_name = "StoryworksUnicode"
    if font_name not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(font_name, str(font_path)))

    out = io.BytesIO()
    document = SimpleDocTemplate(
        out,
        pagesize=LETTER,
        rightMargin=0.8 * inch,
        leftMargin=0.8 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=title,
        author="Storyworks",
    )
    base = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "StoryworksTitle",
        parent=base["Title"],
        fontName=font_name,
        fontSize=20,
        leading=25,
        alignment=TA_CENTER,
        spaceAfter=24,
    )
    heading_style = ParagraphStyle(
        "StoryworksHeading",
        parent=base["Heading1"],
        fontName=font_name,
        fontSize=15,
        leading=19,
        spaceBefore=8,
        spaceAfter=10,
    )
    body_style = ParagraphStyle(
        "StoryworksBody",
        parent=base["BodyText"],
        fontName=font_name,
        fontSize=11,
        leading=16,
        spaceAfter=6,
    )

    story: list[Any] = [Paragraph(escape(title), title_style)]
    for index, (part_title, body) in enumerate(parts):
        if index:
            story.append(PageBreak())
        story.append(Paragraph(escape(part_title), heading_style))
        for line in body.splitlines():
            if line.strip():
                story.append(Paragraph(escape(line), body_style))
            else:
                story.append(Spacer(1, 6))

    def draw_page_number(canvas: Any, doc: Any) -> None:
        canvas.saveState()
        canvas.setFont(font_name, 9)
        canvas.drawRightString(LETTER[0] - 0.8 * inch, 0.42 * inch, str(doc.page))
        canvas.restoreState()

    document.build(story, onFirstPage=draw_page_number, onLaterPages=draw_page_number)
    return out.getvalue()


def export_project(project_dir: Path, format: str) -> dict[str, Any]:
    format = (format or "").lower().strip()
    title = _project_title(project_dir)
    module = _module(project_dir)
    parts = _gather_bodies(project_dir)
    slugish = re.sub(r"[^a-zA-Z0-9_-]+", "-", title).strip("-") or "export"
    stamp = _utc_stamp()

    if format in {"fountain", "fountain.txt"}:
        if module not in {"screenplay", "draft", "novel"}:
            # still allow — judgment: any module can emit fountain-shaped text
            pass
        text = _as_fountain(parts, title)
        return {
            "ok": True,
            "format": "fountain",
            "filename": f"{slugish}-{stamp}.fountain",
            "media_type": "text/plain",
            "content": text,
            "encoding": "utf-8",
        }

    if format in {"fdx", "finaldraft"}:
        text = _as_fdx(parts, title)
        return {
            "ok": True,
            "format": "fdx",
            "filename": f"{slugish}-{stamp}.fdx",
            "media_type": "application/xml",
            "content": text,
            "encoding": "utf-8",
        }

    if format in {"epub"}:
        data = _as_epub(parts, title)
        import base64

        return {
            "ok": True,
            "format": "epub",
            "filename": f"{slugish}-{stamp}.epub",
            "media_type": "application/epub+zip",
            "content": base64.b64encode(data).decode("ascii"),
            "encoding": "base64",
        }

    if format in {"pdf"}:
        import base64

        data = _as_pdf(parts, title)
        return {
            "ok": True,
            "format": "pdf",
            "filename": f"{slugish}-{stamp}.pdf",
            "media_type": "application/pdf",
            "content": base64.b64encode(data).decode("ascii"),
            "encoding": "base64",
        }

    if format in {"markdown", "md"}:
        chunks = [f"# {title}\n"]
        for t, body in parts:
            chunks.append(f"\n## {t}\n\n{body.rstrip()}\n")
        text = "".join(chunks)
        return {
            "ok": True,
            "format": "markdown",
            "filename": f"{slugish}-{stamp}.md",
            "media_type": "text/markdown",
            "content": text,
            "encoding": "utf-8",
        }

    raise ValueError(f"unsupported export format: {format}")


def write_export_sidecar(project_dir: Path, result: dict[str, Any]) -> Path:
    """Optional on-disk copy under project exports/ for local retrieve."""
    out_dir = project_dir / "exports"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / str(result["filename"])
    raw = result["content"]
    if result.get("encoding") == "base64":
        import base64

        path.write_bytes(base64.b64decode(raw))
    else:
        path.write_text(str(raw), encoding="utf-8")
    meta = out_dir / f"{result['filename']}.json"
    meta.write_text(json.dumps({"format": result["format"], "at": _utc_stamp()}, indent=2), encoding="utf-8")
    return path
