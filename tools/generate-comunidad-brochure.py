#!/usr/bin/env python3
"""Genera el brochure comercial de Comunidad Evolución en PDF."""

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "brochure-comunidad-evolucion.pdf"
TMP = ROOT / "tmp" / "pdfs"

W, H = A4

PRIMARY = HexColor("#163A68")
DARK = HexColor("#0F294A")
ACTION = HexColor("#9C2A32")
GOLD = HexColor("#C98E2A")
SAND = HexColor("#F9F7F5")
LIGHT_BLUE = HexColor("#EAF0F7")
MUTED = HexColor("#5C6B7B")
LINE = HexColor("#D9E0E7")

MARGIN = 48


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


def para(c, text, x, y_top, width, st, max_height=200):
    p = Paragraph(text, st)
    _, height = p.wrap(width, max_height)
    p.drawOn(c, x, y_top - height)
    return height


def label(c, text, x, y, color=GOLD):
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(color)
    c.drawString(x, y, text.upper())
    c.setStrokeColor(color)
    c.setLineWidth(2)
    c.line(x, y - 8, x + 34, y - 8)


def rounded_image(c, image_path, x, y, width, height, radius=10):
    path = c.beginPath()
    path.roundRect(x, y, width, height, radius)
    c.saveState()
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(str(image_path), x, y, width, height, preserveAspectRatio=True, mask="auto")
    c.restoreState()


def page_number(c, number, dark=False):
    color = Color(1, 1, 1, alpha=0.65) if dark else MUTED
    c.setFillColor(color)
    c.setFont("Helvetica", 8)
    c.drawRightString(W - MARGIN, 24, f"COMUNIDAD EVOLUCIÓN  ·  {number:02d}")


def top_brand(c, dark=False):
    logo = ROOT / "public" / "img" / "transparente.png"
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, H - 92, 46, 46, 11, fill=1, stroke=0 if dark else 1)
    c.drawImage(str(logo), MARGIN + 5, H - 87, 36, 36, mask="auto")
    c.setFillColor(white if dark else PRIMARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 58, H - 64, "FUNDACIÓN")
    c.setFont("Helvetica-Bold", 15)
    c.drawString(MARGIN + 58, H - 83, "Evolución Antoniana")


def section_header(c, kicker, title, intro=None):
    label(c, kicker, MARGIN, H - 70)
    y = H - 105
    used = para(c, title, MARGIN, y, W - 2 * MARGIN, style(28, 32, DARK, "Helvetica-Bold"))
    if intro:
        para(c, intro, MARGIN, y - used - 12, W - 2 * MARGIN, style(11.5, 17, MUTED), 100)


def card(c, x, y, width, height, number, title, body, fill=white):
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y, width, height, 10, fill=1, stroke=1)
    c.setFillColor(GOLD)
    c.circle(x + 24, y + height - 25, 12, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + 24, y + height - 28, str(number))
    para(c, title, x + 44, y + height - 17, width - 58, style(12.5, 15, DARK, "Helvetica-Bold"), 50)
    para(c, body, x + 18, y + height - 53, width - 36, style(9.5, 13.5, MUTED), height - 60)


def qr(c, url, x, y, size):
    widget = QrCodeWidget(url)
    bounds = widget.getBounds()
    drawing = Drawing(size, size, transform=[size / (bounds[2] - bounds[0]), 0, 0,
                                             size / (bounds[3] - bounds[1]), 0, 0])
    drawing.add(widget)
    renderPDF.draw(drawing, c, x, y)


def prepare_images():
    TMP.mkdir(parents=True, exist_ok=True)
    source = Image.open(ROOT / "public" / "img" / "donativo_cancha.webp").convert("RGB")

    cover = source.resize((1500, 737), Image.Resampling.LANCZOS)
    cover = ImageEnhance.Contrast(cover).enhance(1.04)
    cover.save(TMP / "cover.jpg", quality=90)

    impact = Image.open(ROOT / "public" / "img" / "hogar_abuelos.webp").convert("RGB")
    impact = impact.resize((720, 795), Image.Resampling.LANCZOS)
    impact.save(TMP / "impact.jpg", quality=90)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prepare_images()
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("Comunidad Evolución - Beneficios con propósito")
    c.setAuthor("Fundación Evolución Antoniana")
    c.setSubject("Brochure para comercios aliados")

    # 01. Portada
    c.setFillColor(PRIMARY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    top_brand(c, dark=True)
    label(c, "Beneficios con propósito", MARGIN, H - 146, GOLD)
    para(c, "Comunidad<br/>Evolución", MARGIN, H - 186, W - 2 * MARGIN,
         style(40, 42, white, "Helvetica-Bold"), 120)
    para(c, "Una red que conecta a quienes sostienen la Fundación con comercios comprometidos.",
         MARGIN, H - 288, W - 2 * MARGIN, style(16, 22, Color(1, 1, 1, alpha=0.84)), 90)
    c.drawImage(str(TMP / "cover.jpg"), 0, 0, W, 292, preserveAspectRatio=False, mask="auto")
    c.setFillColor(Color(0.06, 0.16, 0.29, alpha=0.28))
    c.rect(0, 0, W, 292, fill=1, stroke=0)
    c.setFillColor(white)
    c.roundRect(MARGIN, 34, 290, 42, 21, fill=1, stroke=0)
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 20, 50, "PROPUESTA PARA COMERCIOS ALIADOS")
    c.showPage()

    # 02. El modelo
    c.setFillColor(SAND)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    section_header(
        c,
        "Una comunidad que genera valor",
        "Cuando una alianza comercial también impulsa una misión social",
        "Comunidad Evolución articula tres actores con un objetivo común: transformar apoyo en oportunidades concretas.",
    )
    y = 430
    gap = 12
    cw = (W - 2 * MARGIN - gap * 2) / 3
    card(c, MARGIN, y, cw, 180, "01", "Personas", "Sostienen la Fundación y acceden a ventajas cotidianas en comercios aliados.")
    card(c, MARGIN + cw + gap, y, cw, 180, "02", "Comercios", "Se conectan con una comunidad local, ganan visibilidad y reciben información útil.")
    card(c, MARGIN + (cw + gap) * 2, y, cw, 180, "03", "Fundación", "Fortalece la continuidad de sus acciones sin perder el foco en el impacto social.")
    c.setFillColor(PRIMARY)
    c.roundRect(MARGIN, 120, W - 2 * MARGIN, 250, 14, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 50)
    c.drawString(MARGIN + 28, 290, "+")
    para(c, "Valor compartido", MARGIN + 28, 265, 220, style(22, 26, white, "Helvetica-Bold"), 50)
    para(c, "No es una promoción aislada. Es una relación medible entre una causa, una comunidad y el comercio local.",
         MARGIN + 28, 215, 215, style(11, 16, Color(1, 1, 1, alpha=0.78)), 90)
    rounded_image(c, TMP / "impact.jpg", MARGIN + 278, 140, 200, 210, 12)
    page_number(c, 2)
    c.showPage()

    # 03. Propuesta para comercios
    c.setFillColor(white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    section_header(
        c,
        "Por qué sumarse",
        "Una alianza simple, visible y medible",
        "El comercio ofrece un beneficio claro. La Fundación se ocupa de comunicarlo y sostener el circuito.",
    )
    cards = [
        ("01", "Comunidad local", "Acercate a personas vinculadas con una organización de Salta y su misión."),
        ("02", "Difusión", "Tu marca aparece en el catálogo, el detalle del beneficio y las comunicaciones institucionales."),
        ("03", "Operación simple", "Validá el código desde un teléfono. No hace falta instalar software ni integrar sistemas."),
        ("04", "Información útil", "Conocé canjes, personas alcanzadas y consumo declarado cuando se registra el monto."),
    ]
    positions = [(MARGIN, 445), (W / 2 + 6, 445), (MARGIN, 250), (W / 2 + 6, 250)]
    width = (W - 2 * MARGIN - 12) / 2
    for (num, title, body), (x, y) in zip(cards, positions):
        card(c, x, y, width, 166, num, title, body, SAND)
    c.setFillColor(ACTION)
    c.roundRect(MARGIN, 108, W - 2 * MARGIN, 94, 12, fill=1, stroke=0)
    para(c, "Una propuesta bien definida puede generar circulación, recordación y nuevos vínculos sin perder rentabilidad.",
         MARGIN + 24, 172, W - 2 * MARGIN - 48, style(15, 20, white, "Helvetica-Bold", TA_CENTER), 70)
    page_number(c, 3)
    c.showPage()

    # 04. Funcionamiento
    c.setFillColor(SAND)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    section_header(
        c,
        "Cómo funciona",
        "De la propuesta al primer canje en cuatro pasos",
        "La Fundación acompaña la definición y deja por escrito las condiciones para evitar confusiones en el mostrador.",
    )
    steps = [
        ("1", "Proponés", "Nos contás qué beneficio querés ofrecer y a quiénes aplica."),
        ("2", "Acordamos", "Definimos alcance, vigencia, límites y términos junto con tu comercio."),
        ("3", "Publicamos", "Creamos la ficha, sumamos tu marca y comunicamos la propuesta."),
        ("4", "Validás", "La persona genera un código y tu equipo lo confirma desde el teléfono."),
    ]
    start_y = 535
    for i, (n, title, body) in enumerate(steps):
        y = start_y - i * 130
        c.setFillColor(PRIMARY if i % 2 == 0 else DARK)
        c.circle(MARGIN + 28, y + 32, 27, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(MARGIN + 28, y + 27, n)
        if i < len(steps) - 1:
            c.setStrokeColor(GOLD)
            c.setLineWidth(2)
            c.line(MARGIN + 28, y + 4, MARGIN + 28, y - 68)
        para(c, title, MARGIN + 78, y + 52, 180, style(18, 22, DARK, "Helvetica-Bold"), 45)
        para(c, body, MARGIN + 78, y + 20, W - MARGIN - (MARGIN + 78), style(10.5, 15, MUTED), 60)
    page_number(c, 4)
    c.showPage()

    # 05. Beneficios posibles
    c.setFillColor(white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    section_header(
        c,
        "Una propuesta a tu medida",
        "El mejor beneficio es el que tu comercio puede sostener",
        "Buscamos propuestas fáciles de entender, usar y cumplir. La claridad genera confianza y mejores resultados.",
    )
    examples = [
        ("DESCUENTO", "10%, 15% o 20%", "Sobre productos, servicios o categorías definidas."),
        ("PRECIO ESPECIAL", "Valor preferencial", "Una opción concreta para integrantes de la comunidad."),
        ("2X1", "Más valor por compra", "Ideal para propuestas simples y de uso frecuente."),
        ("REGALO", "Un adicional", "Complemento sin cargo con una compra o contratación."),
    ]
    y = 445
    for i, (tag, title, body) in enumerate(examples):
        x = MARGIN if i % 2 == 0 else W / 2 + 6
        yy = y if i < 2 else y - 190
        c.setFillColor(SAND)
        c.roundRect(x, yy, (W - 2 * MARGIN - 12) / 2, 160, 12, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x + 18, yy + 130, tag)
        para(c, title, x + 18, yy + 112, 190, style(17, 21, DARK, "Helvetica-Bold"), 45)
        para(c, body, x + 18, yy + 67, 190, style(10, 14, MUTED), 55)
    c.setFillColor(LIGHT_BLUE)
    c.roundRect(MARGIN, 120, W - 2 * MARGIN, 120, 12, fill=1, stroke=0)
    para(c, "Tres claves", MARGIN + 22, 216, 120, style(9, 12, PRIMARY, "Helvetica-Bold"), 30)
    para(c, "Claro para la persona. Fácil para el mostrador. Sostenible para el comercio.",
         MARGIN + 22, 190, W - 2 * MARGIN - 44, style(16, 21, PRIMARY, "Helvetica-Bold"), 70)
    page_number(c, 5)
    c.showPage()

    # 06. Medición
    c.setFillColor(PRIMARY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    label(c, "Información para decidir", MARGIN, H - 70, GOLD)
    para(c, "Medimos lo que la red genera", MARGIN, H - 105, W - 2 * MARGIN,
         style(30, 34, white, "Helvetica-Bold"), 80)
    para(c, "Cada código confirmado alimenta un reporte pensado para responder preguntas concretas del comercio.",
         MARGIN, H - 185, W - 2 * MARGIN, style(12, 18, Color(1, 1, 1, alpha=0.76)), 70)
    metrics = [
        ("CANJES", "Cuántas veces se utilizó cada beneficio."),
        ("PERSONAS", "Cuántas personas distintas llegaron al comercio."),
        ("CONSUMO", "Monto declarado de las operaciones, cuando se registra."),
        ("AHORRO", "Valor generado para la comunidad cuando puede calcularse."),
    ]
    for i, (title, body) in enumerate(metrics):
        x = MARGIN if i % 2 == 0 else W / 2 + 8
        y = 430 if i < 2 else 250
        c.setFillColor(Color(1, 1, 1, alpha=0.08))
        c.setStrokeColor(Color(1, 1, 1, alpha=0.18))
        c.roundRect(x, y, (W - 2 * MARGIN - 16) / 2, 145, 12, fill=1, stroke=1)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x + 18, y + 112, title)
        para(c, body, x + 18, y + 88, 190, style(11, 16, white, "Helvetica-Bold"), 65)
    para(c, "Datos claros para mejorar la propuesta, no para complicar la operación.",
         MARGIN, 160, W - 2 * MARGIN, style(17, 22, Color(1, 1, 1, alpha=0.9), "Helvetica-Bold", TA_CENTER), 60)
    page_number(c, 6, dark=True)
    c.showPage()

    # 07. Cierre y CTA
    c.setFillColor(SAND)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    top_brand(c, dark=False)
    label(c, "La próxima alianza puede ser la tuya", MARGIN, H - 148, GOLD)
    para(c, "Sumá tu comercio<br/>a Comunidad Evolución", MARGIN, H - 188, W - 2 * MARGIN,
         style(32, 36, DARK, "Helvetica-Bold"), 100)
    para(c, "Ofrecé un beneficio, conectate con una comunidad comprometida y transformemos juntos el valor cotidiano en impacto social.",
         MARGIN, H - 300, W - 2 * MARGIN, style(13, 19, MUTED), 90)
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 250, W - 2 * MARGIN, 250, 14, fill=1, stroke=1)
    qr_url = "https://www.evolucionantoniana.com/club/postular"
    qr(c, qr_url, MARGIN + 28, 292, 150)
    c.linkURL(qr_url, (MARGIN + 28, 292, MARGIN + 178, 442), relative=0)
    para(c, "Escaneá para postular tu comercio", MARGIN + 205, 438, 240,
         style(16, 20, PRIMARY, "Helvetica-Bold"), 60)
    para(c, "Completá el formulario y nuestro equipo se va a comunicar para definir una propuesta clara y sostenible.",
         MARGIN + 205, 385, 240, style(10.5, 15, MUTED), 80)
    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(ACTION)
    c.drawString(MARGIN + 205, 305, "evolucionantoniana.com/club/postular")
    c.linkURL(qr_url, (MARGIN + 205, 295, W - MARGIN - 20, 325), relative=0)
    c.setFillColor(PRIMARY)
    c.roundRect(MARGIN, 128, W - 2 * MARGIN, 84, 12, fill=1, stroke=0)
    para(c, "info@evolucionantoniana.com   ·   +54 387 213-1916   ·   Salta, Argentina",
         MARGIN + 20, 180, W - 2 * MARGIN - 40, style(10.5, 15, white, "Helvetica-Bold", TA_CENTER), 40)
    page_number(c, 7)
    c.save()


if __name__ == "__main__":
    build()
    print(OUTPUT)
