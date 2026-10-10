
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const PUBLIC_DIR = __dirname;

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
};

const server = http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, {
            "Content-Type": "text/plain; charset=utf-8",
            "Allow": "GET, HEAD"
        });
        res.end("Method Not Allowed");
        return;
    }

    let pathname;

    try {
        const requestUrl = new URL(
            req.url,
            `http://${req.headers.host || "localhost"}`
        );

        pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
        res.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8"
        });
        res.end("Bad Request");
        return;
    }

    if (pathname === "/") {
        pathname = "/index.html";
    }

    // Resolve the requested file safely inside the project directory.
    const filePath = path.resolve(
        PUBLIC_DIR,
        "." + pathname
    );

    const relativePath = path.relative(
        PUBLIC_DIR,
        filePath
    );

    if (
        relativePath === ".." ||
        relativePath.startsWith(".." + path.sep) ||
        path.isAbsolute(relativePath)
    ) {
        res.writeHead(403, {
            "Content-Type": "text/plain; charset=utf-8"
        });
        res.end("Forbidden");
        return;
    }

    fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
            res.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8"
            });
            res.end("404 - File Not Found");
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType =
            mimeTypes[extension] || "application/octet-stream";

        res.writeHead(200, {
            "Content-Type": contentType,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-cache"
        });

        if (req.method === "HEAD") {
            res.end();
            return;
        }

        const stream = fs.createReadStream(filePath);

        stream.on("error", () => {
            if (!res.headersSent) {
                res.writeHead(500, {
                    "Content-Type": "text/plain; charset=utf-8"
                });
            }

            res.end("Internal Server Error");
        });

        stream.pipe(res);
    });
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
    } else {
        console.error("Server error:", error.message);
    }

    process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
    console.log(`TaskFlow server running on port ${PORT}`);
    console.log(`Listening on ${HOST}:${PORT}`);
});
