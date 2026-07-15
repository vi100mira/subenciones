import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail } from "../src/apiResponse.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json(fail(
    "Ruta retirada: solicita el redactor, revisa su plan documental y aprueba el hash antes de generar DOCX/PDF privados."
  ));
}
