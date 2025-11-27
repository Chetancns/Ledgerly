// src/main.ts
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { csrfMiddleware } from "./middlewares/csrf.middleware";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // parse cookies first
  app.use(cookieParser());
  app.use(csrfMiddleware);

  // --------------------------------------------------------------
  // Build a safe origins array from FRONTEND_ORIGIN env (comma separated)
  // --------------------------------------------------------------
  const raw = process.env.FRONTEND_ORIGIN || "";
  const candidateList = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const origins: string[] = [];
  for (const entry of candidateList) {
    try {
      // `new URL()` will throw for invalid values
      const u = new URL(entry);
      origins.push(u.origin); // canonical origin: protocol + host (+ port)
    } catch (err) {
      // log invalid values so you can fix env on Render
      console.warn(`[main] Invalid FRONTEND_ORIGIN entry ignored: "${entry}"`);
    }
  }

  // If none valid, fall back to explicit known production origin (or localhost for testing)
  if (origins.length === 0) {
    const fallback = process.env.NODE_ENV === "production"
      ? "https://ledgerly-eight.vercel.app"
      : "http://localhost:3000";
    console.warn(`[main] No valid FRONTEND_ORIGIN entries found; falling back to: ${fallback}`);
    origins.push(fallback);
  }

  console.log("[main] Enabling CORS for origins:", origins);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "x-csrf-token"],
    exposedHeaders: ["Set-Cookie"],
  });

  // Optionally ensure server responds to preflight explicitly (helps some proxies)
  // ✅ Safe version
//app.getHttpAdapter().getInstance().options("*", (req, res) => res.sendStatus(204));
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT ?? 3001;
  await app.listen(port, "0.0.0.0", () => {
    console.log(`[main] App listening on port ${port}`);
  });
}

bootstrap();
