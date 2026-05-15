import { createWriteStream, existsSync, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import https from "https";

const OUT_DIR = new URL("../public/images/db-icons/", import.meta.url).pathname;
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const DB = "https://raw.githubusercontent.com/dbeaver/dbeaver/devel/plugins";
const EXT = `${DB}/org.jkiss.dbeaver.ext`;
const GEN = `${EXT}.generic/icons`;

const ICONS = [
  { file: "derby.png", url: `${GEN}/derby_icon_big.png` },
  { file: "ingres.png", url: `${GEN}/ingres_icon_big.png` },
  { file: "gbase8s.png", url: `${EXT}.gbase8s/icons/gbase8s_icon_big.png` },
  { file: "nuodb.png", url: `${GEN}/nuodb_icon_big.png` },
  { file: "informix.png", url: `${GEN}/informix_icon_big.png` },
  { file: "iris.png", url: `${GEN}/intersystems_icon_big.png` },
  { file: "virtuoso.png", url: `${GEN}/virtuoso_icon_big.png` },
  { file: "teiid.png", url: `${GEN}/teiid_icon_big.png` },
  { file: "maxdb.png", url: `${GEN}/sap_maxdb_icon_big.png` },
  { file: "netezza.png", url: `${GEN}/netezza_icon_big.png` },
  { file: "apache.png", url: `${GEN}/apache_icon_big.png` },
  { file: "dolphindb.png", url: `${GEN}/dolphindb_icon_big.png` },
  { file: "impala.png", url: `${GEN}/impala_icon_big.png` },
  { file: "phoenix.png", url: `${GEN}/phoenix_icon_big.png` },
  { file: "ignite.png", url: `${GEN}/ignite_icon_big.png` },
  { file: "tdengine.png", url: `${GEN}/tdengine_icon_big.png` },
  { file: "machbase.png", url: `${GEN}/machbase_icon_big.png` },
  { file: "h2.png", url: `${GEN}/h2_icon_big.png` },
  { file: "h2gis.png", url: `${EXT}.h2/icons/h2gis_icon_big.png` },
  { file: "orientdb.png", url: `${GEN}/orientdb_icon_big.png` },
  { file: "salesforce.png", url: `${GEN}/salesforce_icon_big.png` },
  { file: "msaccess.png", url: `${GEN}/msaccess_icon_big.png` },
  { file: "csv.png", url: `${GEN}/csv_icon_big.png` },
  { file: "dbf.png", url: `${GEN}/dbf_icon_big.png` },
  { file: "omnisci.png", url: `${GEN}/omnisci_icon_big.png` },
  { file: "mapd.png", url: `${GEN}/mapd_icon_big.png` },
  { file: "wmi.png", url: `${EXT}.wmi/icons/wmi_icon_big.png` },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      pipeline(res, file).then(resolve).catch(reject);
    });
    req.on("error", reject);
  });
}

let ok = 0,
  fail = 0;
for (const { file, url } of ICONS) {
  const dest = path.join(OUT_DIR, file);
  if (existsSync(dest)) {
    console.log(`  ✓ skip  ${file}`);
    ok++;
    continue;
  }
  try {
    await download(url, dest);
    console.log(`  ✓ ok    ${file}`);
    ok++;
  } catch (e) {
    console.log(`  ✗ fail  ${file}  (${e.message})`);
    fail++;
  }
}
console.log(`\nDone: ${ok} ok, ${fail} failed`);
