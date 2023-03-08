import express from "express";

import config from "./config.js";

const app = express();

app.get("/", (req, res, next) => {
  return res.send("Hello World");
});

app.get("/template", (req, res, next) => {
  return res.send("Excel template");
});

app.post("/");

const init = () => {
  app.listen(config.port, () => {
    console.log("Running on http://localhost:" + config.port);
  });
};

init();
