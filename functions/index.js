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
  const date = "Rm+10:15";

  res.send(`
      <!doctype html>
      <head>
        <title>JJDev</title>
      </head>
      <body>
      Em construção... ${date.split(/[+]/)}
      </body>
    </html>`);
});

app.get("/api/bible/book/:id", (req, res) => {
  axiosInstance.get(`/books/${req.params.id}`).then((response) => {
    res.json(response.data);
  });
});

app.get("/api/bible/:version/:key", (req, res) => {
  const keyArr = req.params.key.split(/[+:-]/);
  const book = keyArr[0];
  const chapter = keyArr[1];
  const firstVerse = keyArr[2];
  const lastVerse = keyArr.length > 3 ? keyArr[3] : null;

  axiosInstance
    .get(`/verses/${req.params.version}/${book}/${chapter}`)
    .then((response) => {
      const chp = response.data;
      let finalText = "";
      chp.verses.forEach((v) => {
        if (v.number >= firstVerse && v.number <= lastVerse) {
          finalText += `<strong>${v.number}</strong> ${v.text} `;
        }
      });
      res.send(`<!doctype html>
      <head>
        <title>JJDev</title>
      </head>
      <body>
      ${finalText}
      </body>
    </html>`);
    })
    .catch((error) => {
      res.send(error);
    });
});

exports.app = functions.https.onRequest(app);
