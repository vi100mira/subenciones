# Cola de revision de fuentes privadas, 2026-07-29

Se amplian los proveedores configurables con la pagina oficial de proyectos de Fundacion Unicaja, tras registrar robots y aviso legal. El descubridor solo emite evidencia neutral publica (URL, procedencia, ambito y senales), nunca decide encaje con una entidad.

La migracion crea `platform_private_source_candidates`: una cola exclusiva de plataforma con RLS y sin politicas para tenants. Conserva una ficha evidence-first de bases, entidad convocante, objeto, beneficiarios, territorio, requisitos, gastos, importe, cofinanciacion, fechas, documentacion, criterios y contacto; cada campo es `evidenced`, `uncertain` o `absent` y un hecho exige URL y fragmento. `admin-private-source-candidates` exige superadministrador para leer, ingresar y aprobar/rechazar; incluso tras aprobar mantiene `scanner_eligible` y `publication_eligible` a `false`. No se ha aplicado la migracion ni escrito en Supabase.

El validador `private_source_auto_scan_v1` solo permite rastreo para fuentes con pagina oficial leida directamente, HTTPS, dominio coherente, procedencia/robots/condiciones registrados y sin riesgo. AEF queda pendiente hasta leer cada web oficial; las autoaprobadas se muestrean de forma determinista al 20% y el superadministrador puede cerrar esa auditoria. La aprobacion automatica nunca habilita publicacion, alertas ni matching de tenants.
