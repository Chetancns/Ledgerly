// src/main.ts
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { csrfMiddleware } from "./middlewares/csrf.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // parse cookies first
  app.use(cookieParser());

  // apply CSRF middleware next
  app.use(csrfMiddleware);

  // CORS: if FRONTEND_ORIGIN env set (comma separated), use it; otherwise use default
  const origins = process.env.FRONTEND_ORIGIN?.split(",") || ["https://ledgerly-eight.vercel.app"];
  console.log("[main] Enabling CORS for origins:", origins);
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "Authorization", "x-csrf-token"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["Set-Cookie"],
  });
  const adapter = app.getHttpAdapter();
  adapter.getInstance().options("*", (req, res) => res.sendStatus(204));
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port, "0.0.0.0", () => {
    console.log(`[main] App listening on port ${port}`);
  });
}
bootstrap();
