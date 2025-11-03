import express from "express";

const router = express.Router();

router.get("/", (_request, response) => {
  response.render("login");
});

router.post("/", (_request, response) => {
  response.send("Login form submitted!");
});

export default router;
