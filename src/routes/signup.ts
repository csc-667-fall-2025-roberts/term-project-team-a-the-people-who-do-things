import express from "express";

const router = express.Router();

router.get("/", (_request, response) => {
  response.render("signup");
});

router.post("/", (_request, response) => {
  response.send("Signup form submitted!");
});

export default router;
