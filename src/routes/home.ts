import express from "express";

const router = express.Router();

router.get("/", (_request, response) => {
  response.render("home");
});

export default router;
