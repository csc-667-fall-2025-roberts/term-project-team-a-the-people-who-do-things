import dotenv from "dotenv";
import express from "express";
import createHttpError from "http-errors";
import morgan from "morgan";
import * as path from "path";

// Load environment variables
dotenv.config();

import homeRoutes from "./routes/home";
import loginRoutes from "./routes/login";
import signupRoutes from "./routes/signup";

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Morgan logging - more detailed in development
if (NODE_ENV === "development") {
  app.use(morgan("dev")); // Detailed logging
} else {
  app.use(morgan("combined")); // Standard logging for production
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS views configuration
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Routes
app.use("/", homeRoutes);
app.use("/signup", signupRoutes);
app.use("/login", loginRoutes);

// 404 handler for unmatched routes
app.use((_request, _response, next) => {
  next(createHttpError(404, "Route not found"));
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`http://localhost:${PORT}`);
});
