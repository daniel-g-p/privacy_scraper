import express from "express";

import config from "./config.js";
import middleware from "./middleware.js";
import controller from "./controller.js";
import cron from "./cron.js";

const app = express();

app.set("view engine", "ejs");

app.use(express.static(config.dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/health-check", (req, res) => {
  return res.status(200).json({ id: Date.now() });
});

app.get("/", controller.getHome);

app.get("/list", controller.getList);

app.post("/list", middleware.uploadFile("list"), controller.postList);

app.post("/scan", controller.postScan);

app.get("/output/:filename", controller.getOutput);

app.use((req, res, next) => {
  const url = req.originalUrl;
  if (url === "/favicon.ico") {
    return;
  } else {
    next(new Error("404 @ " + req.originalUrl));
  }
});

app.use((error, req, res, next) => {
  console.log(error);
  return res.redirect("/");
});

const init = () => {
  app.listen(config.port, () => {
    cron();
    console.log("Running on http://localhost:" + config.port);
  });
};

init();
