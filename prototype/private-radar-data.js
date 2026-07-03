const PRIVATE_EVIDENCE = {
  "fundacion-iberdrola-social": {
    basesUrl: "https://www.fundacioniberdrolaespana.org/accion-social/programa-social",
    sourceTextLabel: "Texto fuente privada usado",
    extractedText:
      "Fundacion Iberdrola Espana - Programa Social / Futuro con Energia. La pagina de accion social describe una convocatoria privada para entidades sin animo de lucro legalmente constituidas en Espana, con un proyecto por entidad, duracion maxima de un ano y aportacion de hasta 40.000 EUR. La convocatoria privada indica que las bases y el formulario se consultan en la web de la fundacion; requiere verificar edicion vigente, plazo final y criterios antes de recomendar a un tenant.",
    documents: [
      {
        title: "Programa Social - Fundacion Iberdrola Espana",
        description: "Pagina de convocatoria privada y bases del financiador.",
        url: "https://www.fundacioniberdrolaespana.org/accion-social/programa-social"
      }
    ],
    evidence: [
      "Fuente privada abierta: pagina oficial del Programa Social de Fundacion Iberdrola Espana.",
      "La pagina del financiador contiene bases/convocatoria y condiciones de participacion; no es API publica BDNS.",
      "Requiere revision editorial de plataforma para confirmar edicion, plazo y texto vigente."
    ]
  }
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
  "caixabank-accion-social": ["Accion territorial", "Entidades locales", "Hasta 50.000 EUR"],
  "fundacion-bancaja-social": ["Comunitat Valenciana", "Proyectos sociales", "Segun bases"],
  "ibercaja-proyectos-sociales": ["Insercion laboral", "Entidades sociales", "Ventana anual"],
  "unicaja-fundacion-social": ["Programas sociales", "No lucrativas", "Plazo por confirmar"],
  "cajamar-social": ["Desarrollo local", "Territorio", "Por convenio"],
  "fundacion-randstad-empleabilidad": ["Empleabilidad", "Colectivos vulnerables", "Insercion laboral"],
  "fundacion-repsol-social": ["Inclusion social", "Energia/sostenibilidad", "Ventana anual"],
  "fundacion-naturgy-vulnerabilidad": ["Vulnerabilidad energetica", "Accion social", "Por convenio"],
  "fundacion-orange-digital": ["Inclusion digital", "Autonomia", "Proyecto social"]
};

window.PRIVATE_OPEN_OPPORTUNITIES = [
  ["fundacion-mapfre-social", "Ayudas a proyectos sociales y empleo inclusivo", "Fundacion MAPFRE", "Fundacion corporativa", "Inclusion social", "Estatal", "Convocatoria por verificar", "Media", 78, "Hasta 40.000 EUR"],
  ["fundacion-mutua-madrilena-accion", "Programa de accion social para entidades sin animo de lucro", "Fundacion Mutua Madrilena", "Fundacion corporativa", "Accion social", "Estatal", "Ventana anual por confirmar", "Media", 76, "Segun linea"],
  ["fundacion-iberdrola-social", "Convocatoria social y empleabilidad en transicion energetica", "Fundacion Iberdrola Espana", "Empresa / fundacion", "Formacion y empleo", "Estatal", "Plazo por confirmar", "Baja", 72, "Por proyecto"],
  ["fundacion-endesa-empleo", "Proyectos de formacion para empleo y competencias digitales", "Fundacion Endesa", "Empresa / fundacion", "Empleo joven", "Estatal", "Ventana prevista Q3 2026", "Baja", 71, "Entre 15.000 y 60.000 EUR"],
  ["fundacion-telefonica-digital", "Inclusion digital y empleabilidad para colectivos vulnerables", "Fundacion Telefonica", "Empresa / fundacion", "Competencias digitales", "Estatal", "Convocatoria por verificar", "Media", 74, "Por convenio"],
  ["santander-fundacion-social", "Programa Santander de apoyo a iniciativas sociales", "Banco Santander / fundacion", "Banco / obra social", "Educacion y empleo", "Estatal", "Ventana anual por confirmar", "Media", 73, "Por proyecto"],
  ["bbva-accion-social", "Ayudas privadas para inclusion financiera y empleo", "BBVA / accion social", "Banco / obra social", "Inclusion social", "Estatal", "Plazo por confirmar", "Baja", 69, "Por confirmar"],
  ["caixabank-accion-social", "Accion social territorial para entidades locales", "CaixaBank / accion social", "Banco / obra social", "Accion comunitaria", "Comunitat Valenciana", "Convocatoria por verificar", "Media", 77, "Hasta 50.000 EUR"],
  ["fundacion-bancaja-social", "Convocatoria de proyectos sociales Comunitat Valenciana", "Fundacion Bancaja", "Fundacion bancaria", "Accion social", "Comunitat Valenciana", "Plazo por confirmar", "Media", 75, "Segun bases"],
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
    deadlineStatus: deadlineConfidence === "Alta" ? "open" : "uncertain",
    deadlineConfidence,
    sourceScope: "Privada abierta",
    funderType,
    evidenceQuality: privateEvidence.basesUrl ? "Fuente privada abierta con bases localizadas" : "Fuente privada abierta pendiente de verificacion editorial",
    score,
    amount,
    theme,
    programFeatures: PRIVATE_FEATURES[id] || [theme, funderType, amount],
    basesUrl: privateEvidence.basesUrl || "",
    sourceTextLabel: privateEvidence.sourceTextLabel || "Texto fuente privada usado",
    extractedText: privateEvidence.extractedText || "",
    documents: privateEvidence.documents || [],
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
