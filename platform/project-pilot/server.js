"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");
const BACKUP_FILE = path.join(DATA_DIR, "projects.backup.json");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const DATA_FILE_LABEL = "data/projects.json";
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function openHtmlPage(baseUrl) {
  const pageUrl = new URL("index.html", baseUrl).href;
  const options = {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  };

  const fallback = () => {
    const child = spawn("cmd.exe", ["/d", "/c", "start", "", pageUrl], options);
    child.on("error", (error) => console.error(`Could not open ${pageUrl}: ${error.message}`));
    child.unref();
  };

  try {
    const child = spawn("explorer.exe", [pageUrl], options);
    child.once("error", fallback);
    child.once("exit", (code) => {
      if (code !== 0) fallback();
    });
    child.unref();
  } catch (error) {
    fallback();
  }
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(REPORTS_DIR, { recursive: true });

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function readDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    return { version: 1, savedAt: null, projects: null, dataFile: DATA_FILE_LABEL };
  }
  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (!Array.isArray(parsed.projects)) throw new Error("projects.json does not contain a projects array");
  return { ...parsed, dataFile: DATA_FILE_LABEL };
}

function saveDataFile(payload) {
  if (!payload || !Array.isArray(payload.projects)) throw new Error("Request does not contain a projects array");
  const saved = {
    app: "Project Pilot",
    version: 3,
    savedAt: payload.savedAt || new Date().toISOString(),
    settings: payload.settings && typeof payload.settings === "object" ? payload.settings : {},
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    systems: Array.isArray(payload.systems) ? payload.systems : [],
    projects: payload.projects,
    reports: Array.isArray(payload.reports) ? payload.reports : []
  };
  if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, BACKUP_FILE);
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(saved, null, 2)}\n`, "utf8");
  try {
    fs.renameSync(temporaryFile, DATA_FILE);
  } catch (error) {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    fs.renameSync(temporaryFile, DATA_FILE);
  }
  return saved;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) {
        reject(new Error("Request body is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function readBinaryBody(request, maximumSize = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maximumSize) {
        reject(new Error("Image is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function reportImageFile(id) {
  if (!/^[a-z0-9-]{6,80}$/i.test(id)) throw new Error("Invalid report image id");
  return path.join(REPORTS_DIR, `report-${id}.png`);
}

function reportImagePathFromPublicPath(publicPath) {
  const normalized = String(publicPath || "").replaceAll("\\", "/");
  const match = normalized.match(/^data\/reports\/(report-[a-z0-9-]{6,80}\.png)$/i);
  if (!match) throw new Error("Invalid report image path");
  return path.join(REPORTS_DIR, match[1]);
}

function serveStatic(request, response, pathname) {
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = path.resolve(ROOT, relativePath);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const content = fs.readFileSync(filePath);
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": content.length,
    "Cache-Control": "no-cache"
  });
  if (request.method === "HEAD") response.end();
  else response.end(content);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/api/projects" && request.method === "GET") {
      sendJson(response, 200, readDataFile());
      return;
    }
    if (url.pathname === "/api/projects" && request.method === "PUT") {
      const body = await readRequestBody(request);
      const saved = saveDataFile(JSON.parse(body));
      sendJson(response, 200, { ok: true, savedAt: saved.savedAt, count: saved.projects.length, dataFile: DATA_FILE_LABEL });
      return;
    }
    if (url.pathname.startsWith("/api/report-images/") && request.method === "POST") {
      const id = decodeURIComponent(url.pathname.slice("/api/report-images/".length));
      const content = await readBinaryBody(request);
      if (content.length < 8 || content.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Request is not a PNG image");
      const filePath = reportImageFile(id);
      const temporaryFile = `${filePath}.tmp`;
      fs.writeFileSync(temporaryFile, content);
      fs.renameSync(temporaryFile, filePath);
      sendJson(response, 200, { ok: true, path: `data/reports/${path.basename(filePath)}`, size: content.length });
      return;
    }
    if (url.pathname === "/api/report-images" && request.method === "DELETE") {
      const filePath = reportImagePathFromPublicPath(url.searchParams.get("path"));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      sendJson(response, 200, { ok: true });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "Unknown API endpoint" });
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end("Method not allowed");
      return;
    }
    serveStatic(request, response, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: error.message });
  }
});

function listen(port) {
  const onListening = () => {
    server.removeListener("error", onError);
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/`;
    console.log("Project Pilot is running.");
    console.log(`Application: ${url}`);
    console.log(`Data file: ${DATA_FILE}`);
    console.log("Keep this window open while editing. Press Ctrl+C to stop.");
    if (!process.argv.includes("--no-open")) openHtmlPage(url);
  };
  const onError = (error) => {
    server.removeListener("listening", onListening);
    if (error.code === "EADDRINUSE" && port < 4193) {
      listen(port + 1);
      return;
    }
    console.error(error);
    process.exitCode = 1;
  };
  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(port, "127.0.0.1");
}

process.on("SIGINT", () => server.close(() => process.exit(0)));
listen(4173);
