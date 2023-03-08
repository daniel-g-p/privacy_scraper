import express from "express";
import xlsx from "xlsx";

import config from "./config.js";

import middleware from "./middleware.js";

import controller from "./controller.js";

const app = express();

app.set("view engine", "ejs");

app.use(express.static(config.dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", controller.getHome);

app.get("/list-template", controller.getListTemplate);

app.post("/list", middleware.uploadFile("list"), controller.postList);

app.post("/start", middleware.uploadFile("list"), controller.postStart);

const init = () => {
  app.listen(config.port, () => {
    console.log("Running on http://localhost:" + config.port);
  });
};

init();
