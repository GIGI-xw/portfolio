#!/usr/bin/env node
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const tar = require("C:\\Users\\jay20\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\vm\\tools\\node\\node_modules\\tar");

const SURGE_HOST = "surge.surge.sh";
const EMAIL = "portfolio.gigi2026@mail.com";
const PASSWORD = "Gigi2026Portfolio!";
const DOMAIN = "gigi-image-vault.surge.sh";

function getToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${EMAIL}:${PASSWORD}`).toString("base64");
    const body = JSON.stringify({ msg: "deploy vault" });
    const req = https.request({
      hostname: SURGE_HOST, port: 443, path: "/token", method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}`, "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode < 300) { try { resolve(JSON.parse(data).token); } catch(e){ reject(e); } }
        else reject(new Error(`Token ${res.statusCode}: ${data}`));
      });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

function publish(tarStream, token, domain) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`token:${token}`).toString("base64");
    const req = https.request({
      hostname: SURGE_HOST, port: 443, path: "/" + domain, method: "PUT",
      headers: { "Content-Type": "application/gzip", Accept: "application/x-ndjson", Authorization: `Basic ${auth}`, version: "1.0.0" },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode < 300) resolve(`https://${domain}`);
        else reject(new Error(`Publish ${res.statusCode}: ${data.substring(0,200)}`));
      });
    });
    req.on("error", reject); tarStream.on("error", reject); tarStream.pipe(req);
  });
}

async function main() {
  console.log("1. Getting token...");
  const token = await getToken();
  console.log("   OK");

  const deployDir = path.join(os.tmpdir(), "vault-deploy");
  if (!fs.existsSync(deployDir)) fs.mkdirSync(deployDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, "image-vault.html"), path.join(deployDir, "index.html"));
  console.log("2. Copied");

  console.log("3. Uploading to", DOMAIN, "...");
  const tarStream = tar.c({ gzip: true, cwd: path.dirname(deployDir), portable: true, mtime: new Date(0) }, [path.basename(deployDir)]);
  const url = await publish(tarStream, token, DOMAIN);
  console.log("\n=== SUCCESS ===\n" + url);
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
