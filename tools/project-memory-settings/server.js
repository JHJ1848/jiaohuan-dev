"use strict";

const fsp = require("fs/promises");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");

const HOST = "127.0.0.1";
const DEFAULT_PORT = 37831;
const MAX_BODY_BYTES = 16 * 1024;
const PUBLIC_DIR = path.join(__dirname, "public");
const SCRIPT_PATH = path.resolve(__dirname, "..", "..", "skills", "project-memory", "scripts", "project-memory.js");
const ALLOWED_MODES = new Set(["only_once", "auto", "manually", "do_not_get"]);

function usage(message) {
  if (message) {
    console.error(message);
  }
  console.error("用法：node tools/project-memory-settings/server.js --project-root <路径> [--port <端口>]");
  process.exit(1);
}

function readOptions(argv) {
  let projectRoot;
  let port = DEFAULT_PORT;

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    const value = argv[index + 1];
    if (option === "--project-root") {
      if (!value) usage("缺少 --project-root 的取值。");
      projectRoot = value;
      index += 1;
    } else if (option === "--port") {
      if (!value) usage("缺少 --port 的取值。");
      port = Number(value);
      index += 1;
    } else {
      usage(`未知选项：${option}`);
    }
  }

  if (!projectRoot) usage("必须提供 --project-root。");
  if (!Number.isInteger(port) || port < 1 || port > 65535) usage("--port 必须是 1 到 65535 的整数。");

  return { projectRoot: path.resolve(projectRoot), port };
}

const options = readOptions(process.argv.slice(2));

function runProjectMemory(args) {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, ...args, "--project-root", options.projectRoot, "--json"], {
    cwd: options.projectRoot,
    encoding: "utf8",
    windowsHide: true
  });
  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();

  if (result.error) {
    throw new Error(`无法执行 project-memory 命令：${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(stderr || stdout || `project-memory 以状态码 ${result.status} 退出。`);
  }
  if (!stdout) {
    throw new Error("project-memory 未返回 JSON 输出。");
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`project-memory 返回了无效 JSON：${error.message}`);
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function sendError(response, statusCode, error) {
  sendJson(response, statusCode, { error: error.message || String(error) });
}

function assertSameOrigin(request) {
  const expectedOrigin = `http://${HOST}:${options.port}`;
  if (request.headers.origin !== expectedOrigin) {
    throw new Error("修改状态的请求必须来自本地设置页。");
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
    throw new Error("请求体过大。");
    }
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw new Error(`请求体 JSON 无效：${error.message}`);
  }
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

async function serveStatic(response, pathname) {
  const requestedFile = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(PUBLIC_DIR, requestedFile);
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  if (relativePath.startsWith(`..${path.sep}`) || relativePath === ".." || path.isAbsolute(relativePath)) {
    sendError(response, 403, new Error("静态文件路径无效。"));
    return;
  }

  try {
    const extension = path.extname(filePath);
    const contentType = contentTypes[extension];
    if (!contentType) {
      sendError(response, 404, new Error("未找到静态文件。"));
      return;
    }
    const content = await fsp.readFile(filePath);
    response.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendError(response, 404, new Error("未找到静态文件。"));
      return;
    }
    sendError(response, 500, error);
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${HOST}`);
  const { pathname } = requestUrl;

  try {
    if (request.method === "GET" && pathname === "/api/status") {
      sendJson(response, 200, {
        projectRoot: options.projectRoot,
        runtimePath: path.join(options.projectRoot, ".agents", "project-memory"),
        inspection: runProjectMemory(["inspect"])
      });
      return;
    }
    if (request.method === "GET" && pathname === "/api/policy") {
      sendJson(response, 200, runProjectMemory(["policy", "get"]));
      return;
    }
    if (request.method === "PUT" && pathname === "/api/policy") {
      assertSameOrigin(request);
      const body = await readJsonBody(request);
      if (!ALLOWED_MODES.has(body.memory_get_mode)) {
        sendError(response, 400, new Error("memory_get_mode 只能是 only_once、auto、manually 或 do_not_get。"));
        return;
      }
      sendJson(response, 200, runProjectMemory(["policy", "set", "--mode", body.memory_get_mode]));
      return;
    }
    if (request.method === "POST" && pathname === "/api/rotate") {
      assertSameOrigin(request);
      sendJson(response, 200, runProjectMemory(["rotate"]));
      return;
    }
    if (request.method === "POST" && pathname === "/api/cleanup") {
      assertSameOrigin(request);
      sendJson(response, 200, runProjectMemory(["cleanup"]));
      return;
    }
    if (request.method === "GET") {
      await serveStatic(response, pathname);
      return;
    }
    sendError(response, 404, new Error("未找到路由。"));
  } catch (error) {
    sendError(response, 500, error);
  }
});

server.listen(options.port, HOST, () => {
  console.log(`Project Memory settings: http://${HOST}:${options.port}`);
  console.log(`Project root: ${options.projectRoot}`);
});

server.on("error", (error) => {
  console.error(`无法启动设置服务：${error.message}`);
  process.exitCode = 1;
});
