function privateEvidence(url, title, text, basis = "fuente/programa privado") {
  return {
    basesUrl: url,
    evidenceType: basis,
    sourceTextLabel: "Texto fuente privada usado",
    extractedText: text,
    documents: [{ title, description: `Pagina oficial del financiador: ${basis}.`, url }],
    evidence: [
      `Fuente privada abierta localizada: ${title}.`,
      `Tipo de evidencia: ${basis}; no es API publica BDNS.`,
      "Requiere revision editorial de plataforma para confirmar edicion, plazo y texto vigente."
    ]
  };
}

const PRIVATE_EVIDENCE = {
  "fundacion-mapfre-social": privateEvidence(
    "https://www.fundacionmapfre.org/premios-ayudas/convocatorias/convocatoria-ayudas-proyectos-sociales/",
    "Convocatoria de Ayudas a Proyectos Sociales - Fundacion MAPFRE",
    "Fundacion MAPFRE describe una convocatoria dirigida a entidades sociales para apoyar iniciativas de empleabilidad de personas con discapacidad intelectual o problemas de salud mental y proyectos vinculados a enfermedades raras. La fuente debe revisarse para confirmar edicion vigente, plazo y requisitos aplicables al tenant.",
    "convocatoria privada con bases"
  ),
  "fundacion-mutua-madrilena-accion": privateEvidence(
    "https://www.fundacionmutua.es/accion-social/ayudas-proyectos-sociales/convocatoria-anual/",
    "Convocatoria anual de ayudas a proyectos sociales - Fundacion Mutua Madrilena",
    "Fundacion Mutua Madrilena publica una convocatoria anual de ayudas a proyectos de accion social para entidades sin animo de lucro, con dotacion economica y solicitud online. Requiere confirmar plazo, bases y colectivos prioritarios de la edicion vigente.",
    "convocatoria privada con bases"
  ),
  "fundacion-iberdrola-social": privateEvidence(
    "https://www.fundacioniberdrolaespana.org/accion-social/programa-social",
    "Programa Social - Fundacion Iberdrola Espana",
    "Fundacion Iberdrola Espana - Programa Social / Futuro con Energia. La pagina de accion social describe una convocatoria privada para entidades sin animo de lucro legalmente constituidas en Espana, con un proyecto por entidad, duracion maxima de un ano y aportacion de hasta 40.000 EUR. Requiere verificar edicion vigente, plazo final y criterios antes de recomendar a un tenant.",
    "programa privado con bases"
  ),
  "fundacion-endesa-empleo": privateEvidence(
    "https://www.endesa.com/es/prensa/sala-de-prensa/noticias/social/fundacion-endesa-caritas-formacion-sector-electrico-jovenes-situacion-vulnerabilidad",
    "Fundacion Endesa y Caritas - formacion para empleo",
    "Fundacion Endesa y Caritas han desarrollado formacion en el sector electrico para jovenes en situacion de vulnerabilidad, orientada a mejorar empleabilidad y acceso a oportunidades laborales. Es una fuente de programa/alianza, pendiente de confirmar convocatoria abierta o bases reutilizables.",
    "programa/alianza privada"
  ),
  "fundacion-telefonica-digital": privateEvidence(
    "https://www.fundaciontelefonica.com/",
    "Fundacion Telefonica - empleabilidad y vulnerabilidad digital",
    "Fundacion Telefonica declara como retos sociales la empleabilidad, la educacion y la vulnerabilidad social y digital, trabajando mediante alianzas con entidades. Es fuente de programa privado abierto; requiere confirmar convocatoria, colaboracion o bases concretas antes de recomendar.",
    "programa privado abierto"
  ),
  "santander-fundacion-social": privateEvidence(
    "https://www.fundacionbancosantander.com/es/accion-social/santander-ayuda",
    "Santander Ayuda - Fundacion Banco Santander",
    "Santander Ayuda impulsa proyectos de organizaciones sociales, con convocatorias tematicas y ayuda maxima por proyecto. La pagina indica convocatorias cerradas o futuras segun edicion; requiere revisar plazo y bases vigentes.",
    "convocatoria privada con bases"
  ),
  "bbva-accion-social": privateEvidence(
    "https://www.bbvaassetmanagement.com/es/actualidad/ganadores-convocatoria-solidaria-bbva-futuro-2026/",
    "Convocatoria Solidaria BBVA Futuro 2026",
    "BBVA Asset Management publica la Convocatoria Solidaria BBVA Futuro 2026 y sus proyectos seleccionados, con zonas territoriales y ayudas para proyectos sociales, ambientales y de empleo de colectivos vulnerables. Requiere confirmar futuras ediciones y bases aplicables.",
    "convocatoria privada"
  ),
  "caixabank-accion-social": {
    basesUrl: "https://fundacionlacaixa.org/documents/d/guest/convocatoria-social-comunitat-valenciana-2026-bases-pdf",
    officialUrl: "https://fundacionlacaixa.org/es/convocatorias-sociales-com-valenciana",
    evidenceType: "convocatoria privada territorial con bases PDF",
    sourceTextLabel: "Ficha y bases oficiales usadas",
    extractedText: "Fundacion la Caixa publica la Convocatoria de Proyectos Sociales Comunitat Valenciana 2026. La ficha oficial marca Estado: cerrada; apertura: 24 de febrero de 2026 a las 12 h; cierre: 26 de marzo de 2026 a las 17 h; fecha prevista de resolucion: octubre de 2026. La documentacion de interes contiene Bases de la convocatoria con PDF oficial.",
    documents: [
      {
        title: "Ficha oficial - Convocatoria Social Comunitat Valenciana 2026",
        description: "Pagina territorial donde se localizaron estado, fechas clave y documentacion.",
        url: "https://fundacionlacaixa.org/es/convocatorias-sociales-com-valenciana"
      },
      {
        title: "Bases de la convocatoria - PDF",
        description: "Documento oficial descargable desde la seccion Documentacion de interes.",
        url: "https://fundacionlacaixa.org/documents/d/guest/convocatoria-social-comunitat-valenciana-2026-bases-pdf"
      }
    ],
    evidence: [
      "Ficha oficial localizada: Convocatoria de Proyectos Sociales Comunitat Valenciana 2026.",
      "Estado oficial: cerrada; cierre detectado el 26 de marzo de 2026 a las 17 h.",
      "Bases PDF localizadas navegando desde la ficha territorial a Documentacion de interes > Bases de la convocatoria."
    ]
  },
  "fundacion-bancaja-social": {
    basesUrl: "https://www.fundacionbancaja.es/wp-content/uploads/2026/04/Bases-13a-Convocatoria-Capaces.pdf",
    officialUrl: "https://www.fundacionbancaja.es/convocatoria/13a-convocatoria-fundacion-bancaja-caixabank-capaces/",
    applicationUrl: "https://convocatoriasbancaja.es/capaces2026",
    evidenceType: "convocatoria privada territorial con bases PDF",
    sourceTextLabel: "Ficha y bases oficiales usadas",
    extractedText: "Fundacion Bancaja y CaixaBank publican la 13a Convocatoria Capaces para entidades sociales de la Comunitat Valenciana que trabajan con personas con discapacidad y/o dependencia. La ficha oficial marca Estado: agotado plazo; permite solicitudes online; el plazo indicado llega hasta el 20 de mayo; la ayuda maxima es de 20.000 EUR y los proyectos seleccionados se preveian a finales de junio.",
    documents: [
      {
        title: "Ficha oficial - 13a Convocatoria Fundacion Bancaja CaixaBank Capaces",
        description: "Pagina oficial donde se localizaron estado, plazo, importe, inscripcion y documentos.",
        url: "https://www.fundacionbancaja.es/convocatoria/13a-convocatoria-fundacion-bancaja-caixabank-capaces/"
      },
      {
        title: "Inscripcion online - Capaces 2026",
        description: "Canal de solicitud enlazado desde la ficha oficial.",
        url: "https://convocatoriasbancaja.es/capaces2026"
      },
      {
        title: "Bases convocatoria - PDF",
        description: "Documento oficial descargable desde la seccion Documentos.",
        url: "https://www.fundacionbancaja.es/wp-content/uploads/2026/04/Bases-13a-Convocatoria-Capaces.pdf"
      }
    ],
    evidence: [
      "Ficha oficial localizada: 13a Convocatoria Fundacion Bancaja - CaixaBank Capaces.",
      "Estado oficial: agotado plazo; plazo hasta el 20 de mayo.",
      "Bases PDF e inscripcion online localizadas desde la ficha oficial."
    ]
  },
  "ibercaja-proyectos-sociales": privateEvidence(
    "https://www.fundacionibercaja.es/convocatorias/",
    "Convocatorias - Fundacion Ibercaja",
    "Fundacion Ibercaja publica convocatorias de ayudas para responder a necesidades de empleabilidad, educacion y accion social, apoyando proyectos de entidades sin animo de lucro. Requiere seleccionar convocatoria concreta y bases vigentes.",
    "convocatorias privadas"
  ),
  "unicaja-fundacion-social": privateEvidence(
    "https://www.fundacionunicaja.com/convocatoria-accion-social/",
    "Convocatoria Accion Social - Fundacion Unicaja",
    "Fundacion Unicaja publica una convocatoria de accion social para proyectos e iniciativas que favorezcan la inclusion social de personas y colectivos en situacion de vulnerabilidad, con plazo y descarga de bases por edicion.",
    "convocatoria privada con bases"
  ),
  "cajamar-social": privateEvidence(
    "https://www.cajamar.es/es/comun/informacion-corporativa/fondo-social/",
    "Fondo Social Cooperativo - Cajamar",
    "Cajamar describe su Fondo Social Cooperativo orientado a economia social, cooperativismo, formacion, investigacion aplicada y actividades socioculturales o asistenciales en su entorno de actuacion. Es fuente de programa social, pendiente de convocatoria concreta.",
    "programa/fondo social privado"
  ),
  "fundacion-once-inserta": privateEvidence(
    "https://www.fundaciononce.es/es/que-hacemos/inserta-e-inserta-innovacion",
    "Inserta e Inserta Innovacion - Fundacion ONCE",
    "Fundacion ONCE presenta Inserta Empleo como entidad especializada en formacion y empleo de personas con discapacidad, dirigida a personas que buscan trabajo o quieren potenciar habilidades. Requiere confirmar si procede por convenio, programa o convocatoria concreta.",
    "programa privado abierto"
  ),
  "fundacion-adecco-empleo": privateEvidence(
    "https://fundacionadecco.org/programas-de-empleo-para-personas-en-riesgo-de-exclusion/",
    "Programas de empleo para personas en riesgo de exclusion - Fundacion Adecco",
    "Fundacion Adecco realiza proyectos de integracion laboral con personas en riesgo de exclusion apoyados por empresas, incluyendo mujeres, mayores de 45 anos, jovenes sin experiencia, inmigrantes y otros colectivos. Requiere confirmar modelo de colaboracion o convocatoria.",
    "programa privado abierto"
  ),
  "fundacion-randstad-empleabilidad": privateEvidence(
    "https://www.randstad.es/fundacion-randstad/talento/",
    "Talento y empleo para personas con discapacidad - Fundacion Randstad",
    "Fundacion Randstad ofrece programas de orientacion, formacion e integracion para personas con discapacidad, incluyendo competencias digitales y acompanamiento al empleo. Requiere confirmar si la entidad puede participar via convenio, derivacion o convocatoria.",
    "programa privado abierto"
  ),
  "fundacion-repsol-social": privateEvidence(
    "https://www.fundacionrepsol.com/es/",
    "Fundacion Repsol - transicion energetica e impacto social",
    "Fundacion Repsol impulsa proyectos de transicion energetica con impacto social mediante innovacion y tecnologia. Es fuente de programa privado; requiere localizar convocatoria concreta o via de colaboracion para entidades sociales.",
    "programa privado abierto"
  ),
  "fundacion-naturgy-vulnerabilidad": privateEvidence(
    "https://www.fundacionnaturgy.org/actualidad-1/",
    "Fundacion Naturgy - vulnerabilidad energetica y accion social",
    "Fundacion Naturgy trabaja vulnerabilidad energetica con entidades como Cruz Roja y Caritas, incluyendo fondo solidario, escuela de energia y eficiencia energetica en hogares o centros sociales. Requiere confirmar convocatoria o acuerdo aplicable.",
    "programa privado abierto"
  ),
  "fundacion-orange-digital": privateEvidence(
    "https://fundacionorange.es/mujer-y-tecnologia/edyta/",
    "Programa EDYTA - Fundacion Orange",
    "Fundacion Orange describe EDYTA como programa nacional de educacion y transformacion digital para mujeres y asociaciones del tercer sector que trabajan con colectivos femeninos en riesgo de exclusion y baja empleabilidad. Requiere confirmar convocatoria de entidades o colaboracion vigente.",
    "programa privado abierto"
  ),
  "ford-construyendo-juntos": privateEvidence(
    "https://www.fromtheroad.ford.com/es/es/articles/2025/la-iniciativa-ford-construyendo-juntos-arranca-con-una-campana-h",
    "Ford Construyendo Juntos - accion comunitaria",
    "Ford presenta Construyendo Juntos como iniciativa filantropica para apoyar comunidades, colectivos desfavorecidos y organizaciones solidarias sin animo de lucro. La primera campana espanola se orienta a bancos de alimentos; requiere confirmar si existe via de solicitud o solo colaboracion programatica.",
    "programa RSC privado"
  )
};

const PRIVATE_FEATURES = {
  "fundacion-once-inserta": ["Empleo y discapacidad", "Itinerarios/convenios", "Inclusion laboral"],
  "fundacion-adecco-empleo": ["Riesgo de exclusion", "Orientacion y empleo", "Colaboracion empresarial"],
  "fundacion-mapfre-social": ["Proyectos sociales", "Empleo inclusivo", "Hasta 40.000 EUR"],
  "fundacion-mutua-madrilena-accion": ["Entidades no lucrativas", "Accion social", "Convocatoria anual"],
  "fundacion-iberdrola-social": ["Entidades sin animo de lucro", "Proyecto anual", "Hasta 40.000 EUR"],
  "fundacion-endesa-empleo": ["Formacion para empleo", "Competencias digitales", "Empresa/fundacion"],
  "fundacion-telefonica-digital": ["Inclusion digital", "Colectivos vulnerables", "Competencias digitales"],
  "santander-fundacion-social": ["Educacion y empleo", "Iniciativas sociales", "Proyecto/convenio"],
  "bbva-accion-social": ["Inclusion financiera", "Empleo", "Obra social bancaria"],
  "caixabank-accion-social": ["Cerrada 26/03/2026", "Bases PDF localizadas", "Archivo con evidencia"],
  "fundacion-bancaja-social": ["Agotado plazo 20/05/2026", "Bases PDF localizadas", "Hasta 20.000 EUR"],
  "ibercaja-proyectos-sociales": ["Insercion laboral", "Entidades sociales", "Ventana anual"],
  "unicaja-fundacion-social": ["Programas sociales", "No lucrativas", "Plazo por confirmar"],
  "cajamar-social": ["Desarrollo local", "Territorio", "Por convenio"],
  "fundacion-randstad-empleabilidad": ["Empleabilidad", "Colectivos vulnerables", "Insercion laboral"],
  "fundacion-repsol-social": ["Inclusion social", "Energia/sostenibilidad", "Ventana anual"],
  "fundacion-naturgy-vulnerabilidad": ["Vulnerabilidad energetica", "Accion social", "Por convenio"],
  "fundacion-orange-digital": ["Inclusion digital", "Autonomia", "Proyecto social"],
  "ford-construyendo-juntos": ["RSC corporativa", "Comunidad", "Sin bases publicas"]
};

window.PRIVATE_OPEN_OPPORTUNITIES = [
  ["fundacion-mapfre-social", "Ayudas a proyectos sociales y empleo inclusivo", "Fundacion MAPFRE", "Fundacion corporativa", "Inclusion social", "Estatal", "Convocatoria por verificar", "Media", 78, "Hasta 40.000 EUR"],
  ["fundacion-mutua-madrilena-accion", "Programa de accion social para entidades sin animo de lucro", "Fundacion Mutua Madrilena", "Fundacion corporativa", "Accion social", "Estatal", "Ventana anual por confirmar", "Media", 76, "Segun linea"],
  ["fundacion-iberdrola-social", "Convocatoria social y empleabilidad en transicion energetica", "Fundacion Iberdrola Espana", "Empresa / fundacion", "Formacion y empleo", "Estatal", "Plazo por confirmar", "Baja", 72, "Por proyecto"],
  ["fundacion-endesa-empleo", "Proyectos de formacion para empleo y competencias digitales", "Fundacion Endesa", "Empresa / fundacion", "Empleo joven", "Estatal", "Ventana prevista Q3 2026", "Baja", 71, "Entre 15.000 y 60.000 EUR"],
  ["fundacion-telefonica-digital", "Inclusion digital y empleabilidad para colectivos vulnerables", "Fundacion Telefonica", "Empresa / fundacion", "Competencias digitales", "Estatal", "Convocatoria por verificar", "Media", 74, "Por convenio"],
  ["santander-fundacion-social", "Programa Santander de apoyo a iniciativas sociales", "Banco Santander / fundacion", "Banco / obra social", "Educacion y empleo", "Estatal", "Ventana anual por confirmar", "Media", 73, "Por proyecto"],
  ["bbva-accion-social", "Ayudas privadas para inclusion financiera y empleo", "BBVA / accion social", "Banco / obra social", "Inclusion social", "Estatal", "Plazo por confirmar", "Baja", 69, "Por confirmar"],
  ["caixabank-accion-social", "Convocatoria Social Comunitat Valenciana 2026", "Fundacion la Caixa", "Fundacion bancaria", "Accion comunitaria", "Comunitat Valenciana", "Cerrada - cierre 26/03/2026 17 h", "Alta", 77, "Hasta 50.000 EUR"],
  ["fundacion-bancaja-social", "13a Convocatoria Fundacion Bancaja CaixaBank Capaces", "Fundacion Bancaja", "Fundacion bancaria", "Discapacidad y dependencia", "Comunitat Valenciana", "Cerrada - agotado plazo 20/05/2026", "Alta", 75, "Hasta 20.000 EUR"],
  ["ibercaja-proyectos-sociales", "Proyectos sociales y empleabilidad para entidades", "Fundacion Ibercaja", "Fundacion bancaria", "Insercion laboral", "Estatal", "Ventana anual por confirmar", "Media", 70, "Por proyecto"],
  ["unicaja-fundacion-social", "Ayudas a programas sociales de entidades no lucrativas", "Fundacion Unicaja", "Fundacion bancaria", "Inclusion social", "Estatal", "Plazo por confirmar", "Baja", 66, "Por confirmar"],
  ["cajamar-social", "Iniciativas sociales y desarrollo territorial", "Grupo Cooperativo Cajamar", "Banca cooperativa / obra social", "Desarrollo local", "Comunitat Valenciana", "Convocatoria por verificar", "Baja", 64, "Por convenio"],
  ["fundacion-once-inserta", "Programas de empleo e inclusion de personas con discapacidad", "Fundacion ONCE / Inserta", "Fundacion social", "Discapacidad y empleo", "Estatal", "Ventana abierta por acuerdos", "Media", 82, "Por convenio"],
  ["fundacion-adecco-empleo", "Empleo para personas en riesgo de exclusion", "Fundacion Adecco", "Fundacion corporativa", "Insercion laboral", "Estatal", "Convocatoria por verificar", "Media", 79, "Por colaboracion"],
  ["fundacion-randstad-empleabilidad", "Empleabilidad e inclusion laboral de colectivos vulnerables", "Fundacion Randstad", "Fundacion corporativa", "Insercion laboral", "Estatal", "Plazo por confirmar", "Media", 74, "Por proyecto"],
  ["fundacion-repsol-social", "Proyectos sociales vinculados a energia e inclusion", "Fundacion Repsol", "Empresa / fundacion", "Inclusion y sostenibilidad", "Estatal", "Ventana anual por confirmar", "Baja", 67, "Por confirmar"],
  ["fundacion-naturgy-vulnerabilidad", "Programas contra vulnerabilidad energetica", "Fundacion Naturgy", "Empresa / fundacion", "Vulnerabilidad energetica", "Estatal", "Convocatoria por verificar", "Media", 68, "Por convenio"],
  ["fundacion-orange-digital", "Inclusion digital y autonomia de colectivos vulnerables", "Fundacion Orange", "Empresa / fundacion", "Inclusion digital", "Estatal", "Plazo por confirmar", "Baja", 65, "Por proyecto"]
].map(([id, title, source, funderType, theme, territory, deadline, deadlineConfidence, score, amount]) => {
  const privateEvidence = PRIVATE_EVIDENCE[id] || {};
  return {
    id,
    canonicalKey: id,
    title,
    source,
    territory,
    deadline,
    deadlineStatus: /cerrad|fuera de plazo|caducad|resuelt/i.test(deadline) ? "closed" : deadlineConfidence === "Alta" ? "open" : "uncertain",
    deadlineConfidence,
    sourceAuthority: "issuer_official",
    basesStatus: privateEvidence.officialUrl && privateEvidence.basesUrl ? "located" : "missing_or_unverified",
    actionable: Boolean(privateEvidence.officialUrl && privateEvidence.basesUrl && deadlineConfidence === "Alta" && !/cerrad|fuera de plazo|caducad|resuelt/i.test(deadline)),
    sourceScope: "Privada abierta",
    funderType,
    evidenceQuality: privateEvidence.evidenceType?.includes("relacional") || privateEvidence.evidenceType?.includes("RSC")
      ? "Fuente privada candidata sin bases publicas; requiere aportacion manual"
      : privateEvidence.basesUrl ? "Fuente privada abierta con bases localizadas" : "Fuente privada abierta pendiente de verificacion editorial",
    score,
    amount,
    theme,
    programFeatures: PRIVATE_FEATURES[id] || [theme, funderType, amount],
    basesUrl: privateEvidence.basesUrl || "",
    sourceTextLabel: privateEvidence.sourceTextLabel || "Texto fuente privada usado",
    extractedText: privateEvidence.extractedText || "",
    documents: privateEvidence.documents || [],
    officialUrl: privateEvidence.officialUrl || "",
    fit: [
      `Puede encajar con entidades del tercer sector por ${theme.toLowerCase()}.`,
      "Requiere confirmar bases vigentes, territorio y si admite entidades no lucrativas."
    ],
    risks: [
      "Plazo o criterios no confirmados por el prototipo.",
      "La plataforma debe guardar evidencia antes de recomendarla a un tenant."
    ],
    evidence: privateEvidence.evidence || [
      "Radar privado abierto: financiador identificado como candidato de seguimiento.",
      "Pendiente de captura de bases, hash de pagina y revision humana de plataforma."
    ],
    internalFacts: ["Corpus plataforma", "Sin datos privados tenant", "Revision editorial pendiente"]
  };
});
