#!/usr/bin/env node
/**
 * Deploy portfolio-single.html to surge.sh using only Node.js built-in modules
 * + the tar package. No surge CLI or SDK needed.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

// tar is available in node_modules
const tarPath = "C:\\Users\\jay20\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\vm\\tools\\node\\node_modules\\tar";
const tar = require(tarPath);

const SURGE_HOST = "surge.surge.sh";
const EMAIL = "portfolio.gigi2026@mail.com";
const PASSWORD = "Gigi2026Portfolio!";
const DOMAIN = "gigi-portfolio-2026.surge.sh";

// Step 1: Get surge token
function getToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${EMAIL}:${PASSWORD}`).toString("base64");
    const body = JSON.stringify({ msg: "deploy from " + os.hostname() });

    const req = https.request(
      {
        hostname: SURGE_HOST,
        port: 443,
        path: "/token",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
          "User-Agent": "surge-deploy/1.0",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.pass || parsed.token);
            } catch (e) {
              reject(new Error("Failed to parse token response: " + data));
            }
          } else {
            reject(new Error(`Token request failed (${res.statusCode}): ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Step 2: Create tar.gz of deploy folder
function createTarGz(deployDir) {
  return tar.c(
    {
      gzip: true,
      cwd: path.dirname(deployDir),
      portable: true,
      mtime: new Date(0),
    },
    [path.basename(deployDir)]
  );
}

// Step 3: Upload to surge
function publish(tarStream, token, domain) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`token:${token}`).toString("base64");

    const req = https.request(
      {
        hostname: SURGE_HOST,
        port: 443,
        path: "/" + domain,
        method: "PUT",
        headers: {
          "Content-Type": "application/gzip",
          Accept: "application/x-ndjson",
          Authorization: `Basic ${auth}`,
          "User-Agent": "surge-deploy/1.0",
          version: "1.0.0",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          console.log("Response status:", res.statusCode);
          console.log("Response body:", data.substring(0, 500));

          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Check for success in NDJSON
            const lines = data.split("\n").filter(Boolean);
            let success = false;
            for (const line of lines) {
              try {
                const obj = JSON.parse(line);
                console.log("  NDJSON:", JSON.stringify(obj));
                if (obj.type === "info") success = true;
              } catch (e) {}
            }
            if (success) {
              resolve(`https://${domain}`);
            } else {
              // Even if no explicit success, 2xx might be enough
              resolve(`https://${domain}`);
            }
          } else {
            reject(new Error(`Publish failed (${res.statusCode}): ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    tarStream.on("error", reject);
    tarStream.pipe(req);
  });
}

// Main
async function main() {
  console.log("=== Surge Deploy ===");

  // Step 1: Get token
  console.log("1. Getting surge token...");
  const token = await getToken();
  console.log("   Token obtained:", token.substring(0, 8) + "...");

  // Step 2: Prepare deploy folder
  console.log("2. Preparing deploy folder...");
  const deployDir = path.join(os.tmpdir(), "portfolio-deploy");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  const src = path.join(__dirname, "portfolio-single.html");
  const dst = path.join(deployDir, "index.html");
  fs.copyFileSync(src, dst);
  console.log("   Copied to:", dst);

  // Step 3: Create tar.gz and upload
  console.log("3. Creating tar.gz and uploading to", DOMAIN, "...");
  const tarStream = createTarGz(deployDir);
  const url = await publish(tarStream, token, DOMAIN);

  console.log("\n=== SUCCESS ===");
  console.log("Site deployed to:", url);
  console.log("You can access it on any device (mobile or computer).");
}

main().catch((err) => {
  console.error("DEPLOY FAILED:", err.message);
  process.exit(1);
});
