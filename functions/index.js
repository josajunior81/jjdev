const functions = require("firebase-functions");
const express = require("express");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const {
  getDailyReadingText,
  getText,
  saveCalendar,
} = require("./src/repository");

const axiosInstance = () => {
  return axios.create({
    baseURL: "https://www.abibliadigital.com.br/api/",
    timeout: 1000,
    headers: { Authorization: `Bearer ${functions.config().bible_api.key}` },
  });
};

const app = express();
app.use(cors);

const htmlText = (bodyText) => `<!doctype html>
      <head>
        <title>JJDev</title>
      </head>
      <body>
        ${bodyText}
        <p>_Almeida Corrigida e Fiel_</p>
      </body>
    </html>`;

app.get("/", async (req, res) => {
  let version = req.query.version ? req.query.version : "acf";
  const bodyText = await getDailyReadingText(axiosInstance(), version);

  if (req.query.format == "json") {
    res.send({ text: bodyText });
  } else {
    res.send(htmlText(bodyText));
  }
});

app.post("/api/calendar/:key", async (req, res) => {
  await saveCalendar(req.params.key);
  res.send("Success");
});

app.get("/api/bible/:key", async (req, res) => {
  let finalText = await getText(
    req.query.version ? req.query.version : "acf",
    req.params.key,
    axiosInstance()
  );
  res.send(htmlText(finalText));
});

app.get("/api/calendar/:date", async (req, res) => {
  const date = new Date(req.params.date);
  let finalText = await getDailyReadingText(
    axiosInstance(),
    req.query.version ? req.query.version : "acf",
    date
  );
  res.send(htmlText(finalText));
});

exports.app = functions.https.onRequest(app);

exports.dailyReadingSchedule = functions.pubsub
  .schedule("0 6 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    const transporter = require("nodemailer").createTransport({
      host: "smtp-relay.sendinblue.com",
      port: 587,
      secure: false,
      auth: {
        user: functions.config().mail.user,
        pass: functions.config().mail.password,
      },
    });

    const response = await require("axios").get(
      "https://jjdev-2c935.web.app/?format=json"
    );

    console.log(`${response.data}`);
    console.log(`${JSON.stringify(response.data)}`);

    return transporter
      .sendMail({
        from: '"Josafá Souza Jr." <josafajr@hotmail.com>',
        to: "josafassj@gmail.com, <kim.s.martins@gmail.com>",
        subject: "Leitura diária do bloco",
        html: `<!doctype html>
        <head>
          <title>JJDev</title>
        </head>
        <body>
          ${response.data.text}
          <p>_Almeida Corrigida e Fiel_</p>
        </body>
      </html>`,
      })
      .then((res) => {
        return res;
      });
  });
