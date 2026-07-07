#!/usr/bin/env python3
"""DocForge Word COM bridge sidecar for Windows."""

import json
import sys


def respond(success: bool, message: str, data=None):
    print(json.dumps({"success": success, "message": message, "data": data}))
    sys.stdout.flush()


def ping():
    try:
        import win32com.client  # noqa: F401
        respond(True, "COM available")
    except ImportError:
        respond(False, "pywin32 not installed")
    except Exception as e:
        respond(False, str(e))


def get_word_app():
    import win32com.client
    try:
        return win32com.client.GetActiveObject("Word.Application")
    except Exception:
        return win32com.client.Dispatch("Word.Application")


def write_document(payload):
    try:
        import win32com.client

        data = json.loads(payload)
        word = get_word_app()
        word.Visible = True
        doc = word.Documents.Add()

        for section in data.get("sections", []):
            for block in section.get("blocks", []):
                btype = block.get("type")
                content = block.get("content", {})
                if btype == "heading":
                    level = content.get("level", 1)
                    style = f"Heading {level}"
                    doc.Content.InsertAfter(content.get("text", "") + "\n")
                    para = doc.Paragraphs.Last
                    para.Style = style
                elif btype == "paragraph":
                    doc.Content.InsertAfter(content.get("text", "") + "\n")
                elif btype == "pageBreak":
                    doc.Content.InsertBreak(7)  # wdPageBreak
                elif btype == "horizontalRule":
                    doc.Content.InsertAfter("---\n")

        respond(True, "Document written", {"path": doc.FullName})
    except Exception as e:
        respond(False, str(e))


def read_open_document(_payload):
    try:
        word = get_word_app()
        if word.Documents.Count == 0:
            respond(False, "No open Word document")
            return
        doc = word.ActiveDocument
        text = doc.Content.Text
        respond(True, "Read document", {"text": text[:50000]})
    except Exception as e:
        respond(False, str(e))


def export_pdf(payload):
    try:
        data = json.loads(payload)
        output_path = data.get("outputPath", "")
        word = get_word_app()
        if word.Documents.Count == 0:
            respond(False, "No open document")
            return
        doc = word.ActiveDocument
        doc.ExportAsFixedFormat(output_path, 17)  # wdExportFormatPDF
        respond(True, "PDF exported", {"path": output_path})
    except Exception as e:
        respond(False, str(e))


def update_toc(_payload):
    try:
        word = get_word_app()
        doc = word.ActiveDocument
        for toc in doc.TablesOfContents:
            toc.Update()
        respond(True, "TOC updated")
    except Exception as e:
        respond(False, str(e))


def open_document(payload):
    try:
        data = json.loads(payload)
        path = data.get("path", "")
        if not path:
            respond(False, "No path specified")
            return
        import win32com.client
        word = get_word_app()
        word.Visible = True
        word.Documents.Open(path)
        respond(True, "Document opened", {"path": path})
    except Exception as e:
        respond(False, str(e))


COMMANDS = {
    "ping": lambda p: ping(),
    "write_document": write_document,
    "read_open_document": read_open_document,
    "export_pdf": export_pdf,
    "update_toc": update_toc,
    "open_document": open_document,
}


def main():
    if len(sys.argv) < 2:
        respond(False, "No command specified")
        return
    cmd = sys.argv[1]
    payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
    handler = COMMANDS.get(cmd)
    if not handler:
        respond(False, f"Unknown command: {cmd}")
        return
    handler(payload)


if __name__ == "__main__":
    main()
