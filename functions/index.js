const functions = require("firebase-functions");
const express = require("express");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const helmet = require("helmet");
const multer = require("multer-firebase");
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

const axiosInstanceDBP = axios.create({
  baseURL: functions.config().bible.url,
  timeout: 30000,
  params: {
    v: 4,
    key: functions.config().bible.api_key,
  },
});

const app = express();
app.use(cors);
app.use(helmet());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.disable("x-powered-by");

const htmlText = (bodyText) => `<!doctype html>
      <head>
        <title>JJDev</title>
      </head>
      <body>
        ${bodyText}
        <p>_Almeida Corrigida e Fiel_</p>
      </body>
    </html>`;

app.get("/dbp/bible", async (req, res) => {
  const response = await axiosInstanceDBP.get(`/bibles/PORACF`);
  res.send(response.data);
});

app.get("/dbp/:book/:chapter", async (req, res) => {
  const version = req.query.version ? req.query.version : "PORACF";
  const response = await axiosInstanceDBP.get(
    `/bibles/filesets/${version}/${req.params.book}/${req.params.chapter}`
  );
  res.send(response.data);
});

app.get("/", async (req, res) => {
  let version = req.query.version ? req.query.version : "acf";
  const bodyText = await getDailyReadingText(axiosInstance(), version);

  if (req.query.format == "json") {
    res.send({ text: bodyText });
  } else {
    res.send(htmlText(bodyText));
  }
});

const upload = multer({ storage: multer.memoryStorage() }).fields([
  { name: "texts" },
  { name: "themes" },
]);
app.post("/api/calendar", upload, (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      res.status(400).send("Error");
      return;
    }
    const saveCaller = async (texts, themes) => saveCalendar(texts, themes);
    console.log(req.files["texts"][0]);
    saveCaller(req.files["texts"][0].buffer, req.files["themes"][0].buffer)
      .then(() => {
        res.send("Sucesso");
        console.log(" =============> Finalizou");
      })
      .catch((err) => {
        console.log(err);

        res.status(400).send("Error");
      });
  });
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

// exports.dailyReadingSchedule = functions.pubsub
//   .schedule("0 6 * * *")
//   .timeZone("America/Sao_Paulo")
//   .onRun(async (context) => {
//     const transporter = require("nodemailer").createTransport({
//       host: "smtp-relay.sendinblue.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: functions.config().mail.user,
//         pass: functions.config().mail.password,
//       },
//     });

//     const response = await require("axios").get(
//       "https://jjdev-2c935.web.app/?format=json"
//     );

//     console.log(`${response.data}`);
//     console.log(`${JSON.stringify(response.data)}`);

//     return transporter
//       .sendMail({
//         from: '"Josaf?? Souza Jr." <josafajr@hotmail.com>',
//         to: "josafassj@gmail.com, <kim.s.martins@gmail.com>",
//         subject: "Leitura di??ria do bloco",
//         html: `<!doctype html>
//         <head>
//           <title>JJDev</title>
//         </head>
//         <body>
//           ${response.data.text}
//           <p>_Almeida Corrigida e Fiel_</p>
//         </body>
//       </html>`,
//       })
//       .then((res) => {
//         return res;
//       });
//   });
