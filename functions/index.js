const functions = require("firebase-functions");
const express = require("express");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const {
  getDailyReadingText,
  getText,
  saveCalendar,
} = require("./src/repository");

const axiosInstance = axios.create({
  baseURL: "https://www.abibliadigital.com.br/api/",
  timeout: 1000,
  headers: { Authorization: `Bearer ${functions.config().bible_api.key}` },
});

const app = express();
app.use(cors);

app.get("/", async (req, res) => {
  const bodyText = await getDailyReadingText(axiosInstance);

  res.send(`
      <!doctype html>
      <head>
        <title>JJDev</title>
      </head>
      <body>
        ${bodyText}
        <p>_Almeida Corrigida e Fiel_</p>
      </body>
    </html>`);
});

app.post("/api/calendar/:key", async (req, res) => {
  await saveCalendar(req.params.key);
  res.send("Success");
});

app.get("/api/bible/:version/:key", async (req, res) => {
  let finalText = await getText(
    req.params.version,
    req.params.key,
    axiosInstance
  );
  res.send(`<!doctype html>
    <head>
      <title>JJDev</title>
    </head>
    <body>
    ${finalText}
    </body>
  </html>`);
});

exports.app = functions.https.onRequest(app);

exports.dailyReadingSchedule = functions.pubsub
  .schedule("0 6 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun((context) => {
    const transporter = require("nodemailer").createTransport({
      host: "smtp-relay.sendinblue.com",
      port: 587,
      secure: false,
      auth: {
        user: functions.config().mail.user,
        pass: functions.config().mail.password,
      },
    });

    return transporter
      .sendMail({
        from: '"Josafá Souza Jr." <josafajr@hotmail.com>',
        to: "josafassj@gmail.com, josafa_jr@yahoo.com.br",
        subject: "Leitura diária do bloco",
        text: "https://jjdev-2c935.web.app/",
      })
      .then((res) => {
        return res;
      });
  });
