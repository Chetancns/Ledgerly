import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { csrfMiddleware } from "./middlewares/csrf.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(csrfMiddleware);
  app.enableCors({
  origin: process.env.FRONTEND_ORIGIN?.split(",") || ["http://192.168.1.50:3000"],
  credentials: true,
  allowedHeaders: ["Content-Type", "X-CSRF-Token", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

  //console.log("CORS origins:", process.env.FRONTEND_ORIGIN?.split(","));
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ?? 3001;
  await app.listen(port, "0.0.0.0", () => {
    console.log(`App listening on port ${port}`);
  });
}
bootstrap();
