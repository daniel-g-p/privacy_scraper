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

app.get("/", controller.getHome);

app.get("/list", controller.getList);

app.post("/list", middleware.uploadFile("list"), controller.postList);

app.post("/scan", controller.postScan);

app.get("/output/:filename", controller.getOutput);

app.use((req, res, next) => {
  next(new Error(404));
});

app.use((error, req, res, next) => {
  if (config.nodeEnv === "development") {
    console.log(error);
  }
  return res.redirect("/");
});

const init = () => {
  app.listen(config.port, () => {
    cron();
    if (config.nodeEnv === "development") {
      console.log("Running on http://localhost:" + config.port);
    }
  });
};

init();
