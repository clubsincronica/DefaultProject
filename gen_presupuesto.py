from fpdf import FPDF
from fpdf.fonts import FontFace

PDF = FPDF(format="A4")
PDF.set_auto_page_break(auto=True, margin=15)
PDF.add_page()

# ---- Paleta ----
AZUL = (23, 64, 110)
GRIS = (90, 90, 90)
LINEA = (200, 200, 200)

def h1(txt):
    PDF.set_font("Helvetica", "B", 15)
    PDF.set_text_color(*AZUL)
    PDF.cell(0, 9, txt, ln=1)
    PDF.set_draw_color(*AZUL)
    PDF.set_line_width(0.5)
    y = PDF.get_y()
    PDF.line(PDF.l_margin, y, PDF.w - PDF.r_margin, y)
    PDF.ln(3)
    PDF.set_text_color(0, 0, 0)

def h2(txt):
    PDF.set_font("Helvetica", "B", 11)
    PDF.set_text_color(*AZUL)
    PDF.cell(0, 7, txt, ln=1)
    PDF.set_text_color(0, 0, 0)

def p(txt, size=10, style=""):
    PDF.set_font("Helvetica", style, size)
    PDF.multi_cell(0, 5.2, txt)
    PDF.ln(1)

# ---- Encabezado ----
PDF.set_xy(PDF.l_margin, 8)
PDF.set_font("Helvetica", "B", 16)
PDF.set_text_color(*AZUL)
PDF.cell(0, 8, "PRESUPUESTO - REGULARIZACION DE OBRA EXISTENTE SIN PERMISO", ln=1)
PDF.set_x(PDF.l_margin)
PDF.set_font("Helvetica", "", 10)
PDF.set_text_color(0, 0, 0)
PDF.cell(0, 6, "Partido de General Pueyrredon - Municipalidad de Mar del Plata", ln=1)
PDF.ln(6)

# ---- Datos ----
h2("1. Datos del tramite")
p("Profesional : Matias Cazeaux  -  Matricula: EN TRAMITE")
p("Comitente   : Marta Alicia de la Llosa  -  CUIL 23-00492835-04 (a confirmar digito verificador)")
p("Inmueble    : Gral. Jose de San Martin 3402")
p("Partida     : 045-009884-1")
p("Cedula Catastral : PENDIENTE de descarga (Direccion de Catastro, MGP)")
p("Superficie a regularizar : 56 m2 (sotano 40 m2 + espacio techado 16 m2)")
p("Destino     : Comercial / mixto")
PDF.ln(2)

# ---- Tabla ----
h2("2. Detalle de items (valores abril 2026 - CAPBA D9)")

rows = [
    ("#", "Item arancelario", "Base normativa", "Importe (ARS)"),
    ("1", "Relevamiento / medicion del inmueble", "Tabla A (Dec. 6964/65)", "incluido"),
    ("2", "Planos 'conforme a obra' (4 copias visadas CAPBA)", "RGC Ord. 6997 art. 2.2.2.2", "incluido"),
    ("3", "Informe Tecnico de estado de obra", "Res. CAPBA 161/08", "incluido"),
    ("4", "Contrato profesional y tramite de visado", "-", "incluido"),
    ("5", "Honorarios profesionales (regularizacion obra clandestina)", "min. general vigente", "$1.214.000"),
    ("6", "Visado CEP (CAPBA)", "min. vigente", "desde $56.925"),
    ("7", "Aportes previsionales CAAITBA (10% honorarios)", "Ley 12.490", "$121.400"),
    ("8", "Gestion y tramitacion municipal (Mesa Digital Obras)", "-", "$350.000"),
    ("", "SUBTOTAL PROFESIONAL", "", "$1.742.325"),
    ("9", "Derechos de Construccion (a cargo comitente, ya liquidado)", "-", "$686.303,06"),
]

with PDF.table(width=PDF.w - PDF.l_margin - PDF.r_margin,
               col_widths=(8, 78, 50, 34),
               text_align=("CENTER", "LEFT", "LEFT", "RIGHT"),
               line_height=5.5,
               headings_style=FontFace(emphasis="BOLD", family="Helvetica",
                                     fill_color=(230, 230, 230), color=(0, 0, 0)),
               cell_fill_mode="ROWS",
               cell_fill_color=LINEA) as table:
    for r in rows:
        row = table.row()
        for c in r:
            row.cell(c)

PDF.ln(3)

# ---- Totales ----
h2("3. Resumen de pagos")
p("TOTAL a facturar por el profesional : $1.742.325 (mas CEP si supera el minimo).", style="B")
p("El comitente abona aparte los Derechos de Construccion ($686.303,06) directo a la Municipalidad.")
PDF.ln(2)

# ---- Notas ----
h2("4. Notas importantes")
p("CEDULA CATASTRAL: se obtiene en la Direccion de Catastro de la Municipalidad de General Pueyrredon (online por nro. de partida 045-009884-1, o presencial). Necesaria para iniciar el tramite.")
p("CAMINO: regularizacion por via ordinaria 'Existente sin permiso' (RGC Ord. 6997). Al cumplir la normativa y ser solo acta de inspeccion, no aplica recargo 25%/100% y la contravencion suele extinguirse al aprobarse.")
p("NO INCLUYE: Direccion de Obra / Representacion Tecnica (no requerida para existente), certificacion de escribano (solo regimen vivienda unica 25135), relevamiento de instalaciones especiales, ni honorarios de gestor patentado si se terceriza la gestion.")
p("VIGENCIA: 30 dias. Forma de pago sugerida: 50% al firmar contrato + 50% al visar planos.")
PDF.ln(2)

PDF.set_font("Helvetica", "I", 8)
PDF.set_text_color(*GRIS)
PDF.multi_cell(0, 4.5, "Documento orientativo basado en aranceles CAPBA D9 vigentes (abril 2026) y normativa del Partido de General Pueyrredon. Los montos de CEP y aportes se calculan definitivamente al visar en CAPBA en Linea.")

out = r"C:\Users\tom_w\Documents\Default Project\presupuesto_regularizacion.pdf"
PDF.output(out)
print("PDF generado:", out)
