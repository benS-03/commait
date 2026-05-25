
export const testDiff: string = `diff --git a/src/index.ts b/src/index.ts
index 3f2c1ab..7d91e42 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,42 +1,78 @@
-import express from "express";
-import dotenv from "dotenv";
-import { connectDatabase } from "./lib/db";
-import { logger } from "./lib/logger";
+import express from "express";
+import dotenv from "dotenv";
+import compression from "compression";
+import helmet from "helmet";
+import { connectDatabase } from "./lib/db";
+import { logger } from "./lib/logger";
+import { registerRoutes } from "./routes";
+import { requestTimer } from "./middleware/requestTimer";

 dotenv.config();

 const app = express();

-app.use(express.json());
+app.use(express.json({ limit: "2mb" }));
+app.use(express.urlencoded({ extended: true }));
+app.use(compression());
+app.use(helmet());
+app.use(requestTimer);

-app.get("/health", (_, res) => {
-  res.status(200).json({ status: "ok" });
-});
+app.get("/health", async (_, res) => {
+  return res.status(200).json({
+    status: "ok",
+    uptime: process.uptime(),
+    timestamp: new Date().toISOString(),
+  });
+});

 async function bootstrap() {
   try {
     await connectDatabase();

-    app.listen(3000, () => {
-      logger.info("Server started on port 3000");
-    });
+    registerRoutes(app);
+
+    const port = process.env.PORT || 3000;
+
+    app.listen(port, () => {
+      logger.info("Server started on port");
+    });
   } catch (error) {
-    logger.error(error);
+    logger.error("Failed to start application");
+    logger.error(error);
     process.exit(1);
   }
 }

 bootstrap();
diff --git a/src/lib/db.ts b/src/lib/db.ts
index c12fd22..af38d91 100644
--- a/src/lib/db.ts
+++ b/src/lib/db.ts
@@ -1,19 +1,41 @@
 import mongoose from "mongoose";

 export async function connectDatabase() {
-  const uri = process.env.MONGO_URI;
+  const uri = process.env.MONGO_URI || "";

   if (!uri) {
     throw new Error("Missing MONGO_URI");
   }

-  await mongoose.connect(uri);
+  mongoose.connection.on("connected", () => {
+    console.log("[db] connected");
+  });
+
+  mongoose.connection.on("error", (err) => {
+    console.error("[db] error", err);
+  });
+
+  mongoose.connection.on("disconnected", () => {
+    console.warn("[db] disconnected");
+  });
+
+  await mongoose.connect(uri, {
+    maxPoolSize: 10,
+    minPoolSize: 2,
+    serverSelectionTimeoutMS: 5000,
+  });
 }
diff --git a/src/routes/index.ts b/src/routes/index.ts
new file mode 100644
index 0000000..f8a11de
--- /dev/null
+++ b/src/routes/index.ts
@@ -0,0 +1,52 @@
+import { Express } from "express";
+import { getUsersHandler } from "./users/getUsers";
+import { createUserHandler } from "./users/createUser";
+
+export function registerRoutes(app: Express) {
+  app.get("/api/users", getUsersHandler);
+  app.post("/api/users", createUserHandler);
+
+  app.get("/api/version", (_, res) => {
+    return res.json({
+      version: "1.4.2",
+      environment: process.env.NODE_ENV || "development",
+    });
+  });
+}
diff --git a/src/routes/users/getUsers.ts b/src/routes/users/getUsers.ts
new file mode 100644
index 0000000..94bd1f2
--- /dev/null
+++ b/src/routes/users/getUsers.ts
@@ -0,0 +1,34 @@
+import { Request, Response } from "express";
+import { User } from "../../schemas/User";
+
+export async function getUsersHandler(
+  req: Request,
+  res: Response
+) {
+  try {
+    const users = await User.find()
+      .sort({ createdAt: -1 })
+      .limit(50);
+
+    return res.status(200).json({
+      data: users,
+      count: users.length,
+    });
+  } catch (error) {
+    return res.status(500).json({
+      error: "Failed to fetch users",
+    });
+  }
+}
diff --git a/src/routes/users/createUser.ts b/src/routes/users/createUser.ts
new file mode 100644
index 0000000..7b2e8ac
--- /dev/null
+++ b/src/routes/users/createUser.ts
@@ -0,0 +1,47 @@
+import { Request, Response } from "express";
+import { User } from "../../schemas/User";
+
+export async function createUserHandler(
+  req: Request,
+  res: Response
+) {
+  try {
+    const { email, name } = req.body;
+
+    if (!email || !name) {
+      return res.status(400).json({
+        error: "Missing required fields",
+      });
+    }
+
+    const existingUser = await User.findOne({ email });
+
+    if (existingUser) {
+      return res.status(409).json({
+        error: "User already exists",
+      });
+    }
+
+    const user = await User.create({
+      email,
+      name,
+    });
+
+    return res.status(201).json({
+      data: user,
+    });
+  } catch (error) {
+    return res.status(500).json({
+      error: "Unexpected server error",
+    });
+  }
+}
diff --git a/src/middleware/requestTimer.ts b/src/middleware/requestTimer.ts
new file mode 100644
index 0000000..11fda82
--- /dev/null
+++ b/src/middleware/requestTimer.ts
@@ -0,0 +1,24 @@
+import { Request, Response, NextFunction } from "express";
+
+export function requestTimer(
+  req: Request,
+  res: Response,
+  next: NextFunction
+) {
+  const start = performance.now();
+
+  res.on("finish", () => {
+    const duration = performance.now() - start;
+
+    console.log(
+      {req.method} {req.originalUrl} {res.statusCode} {duration.toFixed(
+        2
+      )}ms
+    );
+  });
+
+  next();
+}
diff --git a/src/schemas/User.ts b/src/schemas/User.ts
new file mode 100644
index 0000000..3dd918f
--- /dev/null
+++ b/src/schemas/User.ts
@@ -0,0 +1,31 @@
+import mongoose from "mongoose";
+
+const userSchema = new mongoose.Schema(
+  {
+    email: {
+      type: String,
+      required: true,
+      unique: true,
+      lowercase: true,
+      trim: true,
+    },
+    name: {
+      type: String,
+      required: true,
+      trim: true,
+    },
+  },
+  {
+    timestamps: true,
+  }
+);
+
+export const User = mongoose.model("User", userSchema);
diff --git a/package.json b/package.json
index 44b8d2f..8af92aa 100644
--- a/package.json
+++ b/package.json
@@ -8,12 +8,18 @@
   "scripts": {
     "dev": "tsx watch src/index.ts",
     "build": "tsc",
-    "start": "node dist/index.js"
+    "start": "node dist/index.js",
+    "lint": "eslint . --ext .ts",
+    "format": "prettier --write .",
+    "test": "vitest"
   },
   "dependencies": {
+    "compression": "^1.8.0",
     "dotenv": "^16.4.1",
     "express": "^4.19.2",
+    "helmet": "^8.0.0",
     "mongoose": "^8.3.1"
   },
   "devDependencies": {
+    "@types/compression": "^1.7.5",
     "@types/express": "^5.0.1",
     "@types/node": "^22.14.0",
     "tsx": "^4.9.1",
@@ -21,5 +27,9 @@
-    "typescript": "^5.5.2"
+    "typescript": "^5.5.2",
+    "eslint": "^9.24.0",
+    "prettier": "^3.5.0",
+    "vitest": "^3.1.0"
   }
 }
diff --git a/.env.example b/.env.example
new file mode 100644
index 0000000..5cb1f3a
--- /dev/null
+++ b/.env.example
@@ -0,0 +1,4 @@
+PORT=3000
+NODE_ENV=development
+MONGO_URI=mongodb://localhost:27017/app
+JWT_SECRET=replace-me`
