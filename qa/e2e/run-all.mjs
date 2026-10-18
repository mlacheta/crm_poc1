// Corre las suites E2E en orden, recargando el seed antes de cada una.
// Requisitos: `npm run db:up`, Chrome instalado y la app corriendo en E2E_BASE_URL (por defecto http://localhost:3123)
// con LUCIA en modo mock, por ejemplo:  npm run build && LLM_PROVIDER=mock npx next start -p 3123
// Uso: npm run test:e2e            (todas)
//      npm run test:e2e -- hito4   (una)
import { execSync } from "node:child_process";
import hito2 from "./hito2.mjs";
import hito3 from "./hito3.mjs";
import hito4 from "./hito4.mjs";

const suites = { hito2, hito3, hito4 };
const selected = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(suites);

let allOk = true;
for (const name of selected) {
  if (!suites[name]) throw new Error(`Suite desconocida: ${name}`);
  execSync("npm run db:seed", { stdio: "ignore" });
  allOk = (await suites[name]()) && allOk;
}
execSync("npm run db:seed", { stdio: "ignore" });
console.log(allOk ? "\nTodas las pruebas pasaron." : "\nHay pruebas fallidas.");
process.exit(allOk ? 0 : 1);
