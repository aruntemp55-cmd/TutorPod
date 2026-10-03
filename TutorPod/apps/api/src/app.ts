import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { AppError, errorBody } from "./errors.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { meRoutes } from "./routes/me.js";
import { podRoutes } from "./routes/pods.js";
import { searchRoutes } from "./routes/search.js";
import { ensureStorage } from "./storage.js";

export async function buildApp() {
  ensureStorage();
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply
        .status(400)
        .send(errorBody("VALIDATION", err.errors[0]?.message ?? "Invalid body"));
    }
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(errorBody(err.code, err.message));
    }
    app.log.error(err);
    return reply
      .status(500)
      .send(errorBody("INTERNAL", "Unexpected server error"));
  });

  app.get("/health", async () => ({ ok: true }));

  await authRoutes(app);
  await meRoutes(app);
  await catalogRoutes(app);
  await searchRoutes(app);
  await podRoutes(app);
  await adminRoutes(app);

  return app;
}
