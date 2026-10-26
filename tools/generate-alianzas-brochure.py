#!/usr/bin/env python3
"""Genera la propuesta ejecutiva de cooperación institucional en PDF."""

from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

from artifact_identity import ENTITY, display_url, site_url


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "brochure-alianzas-evolucion-antoniana.pdf"
TMP = ROOT / "tmp" / "pdfs" / "alianzas"

W, H = A4
MARGIN = 46

PRIMARY = HexColor("#173F73")
DARK = HexColor("#102C50")
ACTION = HexColor("#A52D35")
GOLD = HexColor("#D59520")
SAND = HexColor("#F8F6F2")
PALE = HexColor("#EAF0F7")
MUTED = HexColor("#5B6B7D")
LINE = HexColor("#D8E0E8")


def style(size=10, leading=None, color=DARK, font="Helvetica", align=TA_LEFT):
    return ParagraphStyle(
        name=f"s-{size}-{leading}-{font}-{align}",
        fontName=font,
        fontSize=size,
        leading=leading or size * 1.35,
        textColor=color,
        alignment=align,
        spaceAfter=0,
        spaceBefore=0,
    )


def para(c, text, x, y_top, width, st, max_height=300):
    paragraph = Paragraph(text, st)
    _, height = paragraph.wrap(width, max_height)
    paragraph.drawOn(c, x, y_top - height)
    return height


def label(c, text, x, y, color=GOLD):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(x, y, text.upper())
    c.setStrokeColor(color)
    c.setLineWidth(2)
    c.line(x, y - 8, x + 34, y - 8)


def page_number(c, number, dark=False):
    c.setFillColor(Color(1, 1, 1, alpha=0.62) if dark else MUTED)
    c.setFont("Helvetica", 8)
    c.drawRightString(W - MARGIN, 22, f"{ENTITY['nombre'].upper()}  ·  {number:02d}")


def top_brand(c, dark=False):
    logo = ROOT / "public" / ENTITY["logo"].lstrip("/")
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, H - 91, 44, 44, 10, fill=1, stroke=0 if dark else 1)
    c.drawImage(str(logo), MARGIN + 5, H - 86, 34, 34, mask="auto")
    c.setFillColor(white if dark else PRIMARY)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(MARGIN + 56, H - 63, ENTITY["tipoDisplay"].upper())
    c.setFont("Helvetica-Bold", 14)
    c.drawString(MARGIN + 56, H - 81, ENTITY["nombreCorto"])


def qr(c, url, x, y, size):
    widget = QrCodeWidget(url)
    bounds = widget.getBounds()
    drawing = Drawing(
        size,
        size,
        transform=[
            size / (bounds[2] - bounds[0]),
            0,
            0,
            size / (bounds[3] - bounds[1]),
            0,
            0,
        ],
    )
    drawing.add(widget)
    renderPDF.draw(drawing, c, x, y)


def prepare_images():
    TMP.mkdir(parents=True, exist_ok=True)

    source = Image.open(ROOT / "public" / "img" / "donativo_cancha.webp").convert("RGB")
    cover = ImageOps.fit(source, (1600, 900), method=Image.Resampling.LANCZOS, centering=(0.5, 0.46))
    cover = ImageEnhance.Contrast(cover).enhance(1.05)
    cover.save(TMP / "cover.jpg", quality=91)

    source = Image.open(ROOT / "public" / "img" / "hogar_abuelos.webp").convert("RGB")
    impact = ImageOps.fit(source, (920, 1080), method=Image.Resampling.LANCZOS, centering=(0.5, 0.45))
    impact.save(TMP / "impact.jpg", quality=91)


def draw_metric(c, x, y, value, title, body, width):
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, width, 105, 10, fill=1, stroke=1)
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(x + 16, y + 67, value)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(x + 16, y + 47, title.upper())
    para(c, body, x + 16, y + 35, width - 32, style(7.8, 10.5, MUTED), 30)


def draw_track(c, x, y, number, title, body, width):
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, width, 122, 11, fill=1, stroke=1)
    c.setFillColor(GOLD)
    c.circle(x + 23, y + 94, 11, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(x + 23, y + 91, number)
    para(c, title, x + 43, y + 106, width - 58, style(11.5, 14, DARK, "Helvetica-Bold"), 34)
    para(c, body, x + 16, y + 72, width - 32, style(8.6, 12, MUTED), 58)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prepare_images()

    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle(f"Propuesta de cooperación institucional - {ENTITY['nombre']}")
    c.setAuthor(ENTITY["nombre"])
    c.setSubject("Propuesta ejecutiva para empresas, instituciones y aliados estratégicos")

    # 01. Portada: una tesis clara, no una explicación operativa.
    c.setFillColor(PRIMARY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    top_brand(c, dark=True)
    label(c, "Propuesta de cooperación institucional", MARGIN, H - 142)
    para(
        c,
        "No buscamos un sponsor.<br/><font color='#D59520'>Buscamos un aliado.</font>",
        MARGIN,
        H - 182,
        W - 2 * MARGIN,
        style(34, 38, white, "Helvetica-Bold"),
        110,
    )
    para(
        c,
        "Tenemos una misión, programas en marcha y capacidad para convertir una alianza en oportunidades concretas. Para crecer, necesitamos organizaciones que quieran hacerlo con nosotros.",
        MARGIN,
        H - 292,
        W - 2 * MARGIN,
        style(13, 19, Color(1, 1, 1, alpha=0.83)),
        90,
    )
    c.drawImage(str(TMP / "cover.jpg"), 0, 0, W, 318, preserveAspectRatio=False, mask="auto")
    c.setFillColor(Color(0.04, 0.13, 0.24, alpha=0.24))
    c.rect(0, 0, W, 318, fill=1, stroke=0)
    c.setFillColor(white)
    c.roundRect(MARGIN, 36, W - 2 * MARGIN, 44, 22, fill=1, stroke=0)
    para(
        c,
        "SALTA  ·  DESDE 2020  ·  EDUCACIÓN  ·  DEPORTE  ·  INCLUSIÓN  ·  TECNOLOGÍA",
        MARGIN + 14,
        64,
        W - 2 * MARGIN - 28,
        style(8.5, 11, PRIMARY, "Helvetica-Bold", TA_CENTER),
        20,
    )
    c.showPage()

    # 02. Prueba de capacidad y ambición.
    c.setFillColor(SAND)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    label(c, "Una organización en movimiento", MARGIN, H - 68)
    para(
        c,
        "Base real. Ambición de escala.",
        MARGIN,
        H - 103,
        W - 2 * MARGIN,
        style(29, 33, DARK, "Helvetica-Bold"),
        55,
    )
    para(
        c,
        "Nacimos en Salta en 2020 y nos constituimos legalmente en 2022. Articulamos territorio, gestión y tecnología para sostener oportunidades en el tiempo.",
        MARGIN,
        H - 151,
        W - 2 * MARGIN,
        style(10.5, 15, MUTED),
        55,
    )

    metric_gap = 8
    metric_w = (W - 2 * MARGIN - metric_gap * 3) / 4
    metrics = [
        ("305+", "Personas", "alcanzadas por nuestros programas"),
        ("7", "Proyectos", "sociales y tecnológicos activos"),
        ("6", "Años", "construyendo capacidad institucional"),
        ("4", "Reconocimientos", "a la innovación social"),
    ]
    for i, metric in enumerate(metrics):
        draw_metric(c, MARGIN + i * (metric_w + metric_gap), 520, *metric, metric_w)

    rounded_x = MARGIN
    rounded_y = 204
    rounded_w = 196
    rounded_h = 274
    path = c.beginPath()
    path.roundRect(rounded_x, rounded_y, rounded_w, rounded_h, 12)
    c.saveState()
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(str(TMP / "impact.jpg"), rounded_x, rounded_y, rounded_w, rounded_h, preserveAspectRatio=False, mask="auto")
    c.restoreState()

    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN + 214, rounded_y, W - MARGIN - (MARGIN + 214), rounded_h, 12, fill=1, stroke=1)
    label(c, "Capacidad instalada", MARGIN + 234, rounded_y + rounded_h - 28, PRIMARY)
    capabilities = [
        ("Educación", "Formación permanente para jóvenes y adultos, articulada con el sistema educativo provincial."),
        ("Deporte", "Becas, equipamiento y acompañamiento integral dentro y fuera de la cancha."),
        ("Inclusión", "Acciones con comedores, hogares, clubes y organizaciones de la comunidad salteña."),
        ("Tecnología", "Plataforma propia para aportes, actividades, beneficios y rendición pública."),
    ]
    y = rounded_y + rounded_h - 68
    for idx, (title, body) in enumerate(capabilities):
        c.setFillColor(GOLD)
        c.circle(MARGIN + 237, y + 3, 7, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawCentredString(MARGIN + 237, y + 1, str(idx + 1))
        para(c, title, MARGIN + 253, y + 12, 220, style(9.5, 12, DARK, "Helvetica-Bold"), 20)
        para(c, body, MARGIN + 253, y - 8, 238, style(7.9, 10.7, MUTED), 35)
        y -= 54

    c.setFillColor(PALE)
    c.roundRect(MARGIN, 82, W - 2 * MARGIN, 100, 10, fill=1, stroke=0)
    para(c, "Gestión verificable", MARGIN + 18, 158, 120, style(9, 12, PRIMARY, "Helvetica-Bold"), 24)
    para(
        c,
        "La transparencia no es una promesa: contamos con rendición pública, trazabilidad de aportes y documentación institucional.",
        MARGIN + 142,
        160,
        W - 2 * MARGIN - 160,
        style(8.8, 12, PRIMARY),
        38,
    )
    para(
        c,
        "<b>Hoy articulamos con:</b> Google for Nonprofits, Microsoft for Nonprofits, Atlassian Social Impact, Canva for Nonprofits, Mercado Libre Solidario, Goodstack, UBA Económicas, Gobierno de Salta y DigitalMatchGlobal.",
        MARGIN + 18,
        123,
        W - 2 * MARGIN - 36,
        style(7.4, 10.2, MUTED),
        36,
    )
    page_number(c, 2)
    c.showPage()

    # 03. La propuesta de valor mutua.
    c.setFillColor(white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    label(c, "Dónde podemos encontrarnos", MARGIN, H - 68)
    para(
        c,
        "Cooperar no es poner un logo.<br/>Es construir valor compartido.",
        MARGIN,
        H - 103,
        W - 2 * MARGIN,
        style(27, 31, DARK, "Helvetica-Bold"),
        82,
    )
    para(
        c,
        "Somos francos: necesitamos recursos, conocimiento y alcance para visibilizar y ampliar nuestro trabajo. A cambio, ofrecemos una plataforma creíble para convertir compromiso empresarial en acciones visibles, concretas y medibles.",
        MARGIN,
        H - 188,
        W - 2 * MARGIN,
        style(10.5, 15, MUTED),
        70,
    )

    gap = 10
    track_w = (W - 2 * MARGIN - gap) / 2
    tracks = [
        ("01", "Impulsar un programa", "Financiar equipamiento, becas, traslados, formación o una campaña con destino y rendición definidos."),
        ("02", "Aportar capacidad", "Sumar productos, servicios, tecnología, conocimiento profesional o voluntariado corporativo."),
        ("03", f"Activar {ENTITY['comunidad']['nombre']}", "Ofrecer un beneficio y generar contenido, sorteos o experiencias para una comunidad comprometida."),
        ("04", "Construir una alianza", "Diseñar una iniciativa institucional con objetivos, responsabilidades, calendario e indicadores compartidos."),
    ]
    positions = [(MARGIN, 390), (MARGIN + track_w + gap, 390), (MARGIN, 254), (MARGIN + track_w + gap, 254)]
    for track, position in zip(tracks, positions):
        draw_track(c, *position, *track, track_w)

    c.setFillColor(PRIMARY)
    c.roundRect(MARGIN, 105, W - 2 * MARGIN, 116, 12, fill=1, stroke=0)
    para(c, "Lo que recibe el aliado", MARGIN + 20, 194, 155, style(11, 14, GOLD, "Helvetica-Bold"), 28)
    para(
        c,
        "Visibilidad con propósito  ·  historias y contenidos creíbles  ·  conexión con la comunidad  ·  activaciones compartidas  ·  seguimiento y rendición",
        MARGIN + 20,
        169,
        W - 2 * MARGIN - 40,
        style(10.2, 15, white, "Helvetica-Bold", TA_CENTER),
        55,
    )
    page_number(c, 3)
    c.showPage()

    # 04. Red actual y conversación de entrada.
    c.setFillColor(SAND)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    top_brand(c, dark=False)
    label(c, "La próxima alianza puede empezar acá", MARGIN, H - 142)
    para(
        c,
        "No ofrecemos un paquete cerrado.<br/><font color='#A52D35'>Diseñamos una cooperación posible.</font>",
        MARGIN,
        H - 179,
        W - 2 * MARGIN,
        style(27, 31, DARK, "Helvetica-Bold"),
        85,
    )
    para(
        c,
        "Empezamos por una conversación: qué desafío queremos resolver, qué puede aportar cada parte y cómo vamos a demostrar el resultado.",
        MARGIN,
        H - 272,
        W - 2 * MARGIN,
        style(11, 16, MUTED),
        58,
    )

    step_w = (W - 2 * MARGIN - 20) / 3
    steps = [
        ("1", "Escuchamos", "Objetivos, capacidades y límites de ambas organizaciones."),
        ("2", "Diseñamos", "Una acción clara, viable y valiosa para la comunidad."),
        ("3", "Activamos y rendimos", "Ejecución, comunicación y evidencia de lo realizado."),
    ]
    for idx, (num, title, body) in enumerate(steps):
        x = MARGIN + idx * (step_w + 10)
        c.setFillColor(white)
        c.setStrokeColor(LINE)
        c.roundRect(x, 385, step_w, 122, 10, fill=1, stroke=1)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 17)
        c.drawString(x + 15, 475, num)
        para(c, title, x + 15, 459, step_w - 30, style(10.5, 13, DARK, "Helvetica-Bold"), 25)
        para(c, body, x + 15, 431, step_w - 30, style(8, 11, MUTED), 45)

    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 164, W - 2 * MARGIN, 188, 12, fill=1, stroke=1)
    c.setFillColor(PALE)
    c.roundRect(MARGIN + 14, 178, 160, 160, 10, fill=1, stroke=0)
    partner_url = site_url(ENTITY["rutas"]["postularAlianza"])
    qr(c, partner_url, MARGIN + 29, 193, 130)
    c.linkURL(partner_url, (MARGIN + 29, 193, MARGIN + 159, 323), relative=0)
    para(c, "Conversemos", MARGIN + 198, 316, 250, style(19, 23, PRIMARY, "Helvetica-Bold"), 40)
    para(
        c,
        "Escaneá el código o escribinos. Queremos conocer qué puede aportar tu organización y qué impacto podemos construir juntos.",
        MARGIN + 198,
        274,
        270,
        style(9.5, 14, MUTED),
        65,
    )
    c.setFillColor(ACTION)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN + 198, 199, display_url(ENTITY["rutas"]["postularAlianza"]))
    c.linkURL(partner_url, (MARGIN + 198, 190, W - MARGIN - 16, 214), relative=0)

    c.setFillColor(PRIMARY)
    c.roundRect(MARGIN, 72, W - 2 * MARGIN, 64, 11, fill=1, stroke=0)
    para(
        c,
        f"{ENTITY['contacto']['email']}  ·  {ENTITY['contacto']['telefono']}  ·  {ENTITY['ubicacion']}",
        MARGIN + 18,
        111,
        W - 2 * MARGIN - 36,
        style(9.5, 13, white, "Helvetica-Bold", TA_CENTER),
        30,
    )
    page_number(c, 4)
    c.save()


if __name__ == "__main__":
    build()
    print(OUTPUT)
