const functions = require("firebase-functions");
const express = require("express");
const axios = require("axios");
const cors = require("cors")({ origin: true });

const axiosInstance = axios.create({
  baseURL: "https://www.abibliadigital.com.br/api/",
  timeout: 1000,
  headers: { Authorization: `Bearer ${functions.config().bible_api.key}` },
});

const app = express();
app.use(cors);

app.get("/", (req, res) => {
  res.send(`
      <!doctype html>
      <head>
        <title>JJDev</title>
      </head>
      <body>
      Em construção...
      </body>
    </html>`);
});

app.get("/api/bible/book/:id", (req, res) => {
  axiosInstance.get(`/books/${req.params.id}`).then((response) => {
    res.json(response.data);
  });
});

exports.app = functions.https.onRequest(app);
