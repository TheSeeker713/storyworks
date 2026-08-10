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


def _as_fdx(parts: list[tuple[str, str]], title: str) -> str:
    paras: list[str] = []
    for t, body in parts:
        paras.append(
            f'    <Paragraph Type="Scene Heading"><Text>{escape(t.upper())}</Text></Paragraph>'
        )
        for line in body.splitlines():
            if not line.strip():
                continue
            paras.append(
                f'    <Paragraph Type="Action"><Text>{escape(line)}</Text></Paragraph>'
            )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n'
        '<FinalDraft DocumentType="Script" Template="No" Version="1">\n'
        f"  <Content>\n"
        f'    <Paragraph Type="Action"><Text>{escape(title)}</Text></Paragraph>\n'
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
    """Minimal single-page-stream PDF (text only). Good enough for draft print/export."""
    text_lines = [title, ""]
    for t, body in parts:
        text_lines.append(t)
        text_lines.extend(body.splitlines())
        text_lines.append("")
    # Escape PDF string literals loosely
    content_ops = ["BT", "/F1 11 Tf", "50 750 Td", "14 TL"]
    for i, line in enumerate(text_lines[:200]):
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        safe = re.sub(r"[^\x20-\x7E]", "?", safe)[:120]
        if i == 0:
            content_ops.append(f"({safe}) Tj")
        else:
            content_ops.append(f"T* ({safe}) Tj")
    content_ops.append("ET")
    stream = "\n".join(content_ops).encode("latin-1", errors="replace")
    objs: list[bytes] = []
    objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objs.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objs.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
    )
    objs.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
    objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objs, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode("ascii"))
        out.write(obj)
        out.write(b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n".encode("ascii"))
    out.write(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.write(f"{off:010d} 00000 n \n".encode("ascii"))
    out.write(
        f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode(
            "ascii"
        )
    )
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
