const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";
export async function loggingMiddleware(req, res, next) {
    const startTime = Date.now();

    res.on("finish", async () => {
        const duration = Date.now() - startTime;
        let level = "info";
        if (res.statusCode >= 400 && res.statusCode < 500) {
            level = "warn";
        } else if (res.statusCode >= 500) {
            level = "error";
        }
        const payload = {
            stack: "backend",
            level: level,
            package: "middleware",
            message: `${req.method} ${req.originalUrl} responded with status ${res.statusCode} in ${duration}ms`
        };
        try {
            await fetch(LOG_API_URL, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error("[Logger Package Error] Failed sending lifecycle log:", error.message);
        }
    });
    next();
}