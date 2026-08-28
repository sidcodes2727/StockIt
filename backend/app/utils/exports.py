"""CSV and PDF export helpers used by the reports module."""

from __future__ import annotations

import csv
import io
from datetime import date
from typing import Any, Sequence

from flask import Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Muted slate/indigo to match the frontend palette rather than ReportLab defaults.
_INK = colors.HexColor("#0f172a")
_MUTED = colors.HexColor("#64748b")
_ACCENT = colors.HexColor("#4f46e5")
_HAIRLINE = colors.HexColor("#e2e8f0")
_ZEBRA = colors.HexColor("#f8fafc")


def csv_response(
    filename: str, headers: Sequence[str], rows: Sequence[Sequence[Any]]
) -> Response:
    """Stream a list of rows as a downloadable CSV file."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(headers)
    for row in rows:
        writer.writerow(["" if value is None else value for value in row])

    # BOM so Excel on Windows detects UTF-8 and renders ₹ / accents correctly.
    payload = "﻿" + buffer.getvalue()
    return Response(
        payload,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


def pdf_table_response(
    filename: str,
    title: str,
    subtitle: str,
    headers: Sequence[str],
    rows: Sequence[Sequence[Any]],
    *,
    summary: Sequence[tuple[str, str]] = (),
    numeric_columns: Sequence[int] = (),
) -> Response:
    """Render a report as a clean, printable PDF table."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4) if len(headers) > 6 else A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=title,
        author="StockFlow",
    )

    sheet = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=sheet["Heading1"],
        fontSize=17,
        leading=21,
        textColor=_INK,
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=sheet["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=_MUTED,
    )
    cell_style = ParagraphStyle(
        "Cell", parent=sheet["Normal"], fontSize=8.5, leading=11, textColor=_INK
    )

    story: list[Any] = [
        Paragraph(title, title_style),
        Paragraph(subtitle, subtitle_style),
        Spacer(1, 7 * mm),
    ]

    if summary:
        summary_data = [
            [Paragraph(f"<b>{label}</b>", cell_style), Paragraph(str(value), cell_style)]
            for label, value in summary
        ]
        summary_table = Table(summary_data, hAlign="LEFT", colWidths=[52 * mm, 52 * mm])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), _ZEBRA),
                    ("BOX", (0, 0), (-1, -1), 0.5, _HAIRLINE),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, _HAIRLINE),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story += [summary_table, Spacer(1, 7 * mm)]

    table_data = [[Paragraph(f"<b>{h}</b>", cell_style) for h in headers]]
    for row in rows:
        table_data.append(
            [
                Paragraph("" if value is None else str(value), cell_style)
                for value in row
            ]
        )

    if len(table_data) == 1:
        table_data.append(
            [Paragraph("<i>No records in this range.</i>", cell_style)]
            + [Paragraph("", cell_style)] * (len(headers) - 1)
        )

    table = Table(table_data, repeatRows=1, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), _ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, _ACCENT),
        ("INNERGRID", (0, 1), (-1, -1), 0.35, _HAIRLINE),
        ("BOX", (0, 0), (-1, -1), 0.5, _HAIRLINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _ZEBRA]),
    ]
    for index in numeric_columns:
        style.append(("ALIGN", (index, 1), (index, -1), "RIGHT"))
        style.append(("ALIGN", (index, 0), (index, 0), "RIGHT"))
    table.setStyle(TableStyle(style))

    story.append(table)

    header_note = ParagraphStyle(
        "Footer", parent=sheet["Normal"], fontSize=8, textColor=_MUTED
    )
    story += [
        Spacer(1, 8 * mm),
        Paragraph(
            f"Generated by StockFlow on {date.today().isoformat()} · "
            f"{max(len(rows), 0)} record(s)",
            header_note,
        ),
    ]

    doc.build(story)
    buffer.seek(0)

    return Response(
        buffer.getvalue(),
        mimetype="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
