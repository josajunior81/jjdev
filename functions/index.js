const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const fs = require("fs");
const path = require("path");

admin.initializeApp();

const axiosInstance = axios.create({
  baseURL: "https://www.abibliadigital.com.br/api/",
  timeout: 1000,
  headers: { Authorization: `Bearer ${functions.config().bible_api.key}` },
});

const app = express();
app.use(cors);

app.get("/", async (req, res) => {
  const date = new Date();
  const year = new Intl.DateTimeFormat("en", { year: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("en", { month: "2-digit" }).format(
    date
  );
  const day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);

  const docRef = admin
    .firestore()
    .collection("daily_reading")
    .doc(`${year}${month}${day}`);

  const doc = await docRef.get();

  if (!doc.exists) {
    res.send("Nada pra hoje");
  } else {
    console.info("Document data:", doc.data());
  }

  const theme = await doc.data().themeRef.get();
  let questions = "";

  for (let i = 0; i < theme.data().questions.length; i++) {
    questions += `${i + 1}. ${theme.data().questions[i]}<br>`;
  }

  let texts = "";

  for (const t of doc.data().text) {
    const verse = await getText(t);
    texts += `*${t.replace("+", " ")}*<br>${verse}<br><br>`;
  }

  res.send(`
      <!doctype html>
      <head>
        <title>JJDev</title>
      </head>
      <body>
      *${theme.id} - ${theme.data().title}*
        <br>
        \`\`\`${questions}\`\`\`
        <br>
        ${texts}
      </body>
    </html>`);
});

app.get("/api/calendar/:key", async (req, res) => {
  const filePathThemes = path.join(
    __dirname,
    `calendar/${req.params.key}.themes`
  );

  const themesData = fs.readFileSync(filePathThemes, "utf8");
  for (const line of themesData.split(/\r?\n/)) {
    const t = line.split("|");
    const id = t[0];
    const title = t[1];
    const questions = t.slice(2, t.length);
    const theme = {
      questions: questions,
      title: title,
    };
    await admin.firestore().collection("theme").doc(id).set(theme);
  }

  const filePath = path.join(__dirname, `calendar/${req.params.key}.texts`);
  try {
    const data = fs.readFileSync(filePath, "utf8");

    for (const line of data.split(/\r?\n/)) {
      const d = line.split("|");
      const date = d[0];
      const text = d[1].split(" ");
      const themeRef = d[2];

      let newItem = {
        text: text,
        themeRef: admin.firestore().doc(`theme/${themeRef}`),
      };

      await admin
        .firestore()
        .collection("daily_reading")
        .doc(date)
        .set(newItem);
    }
  } catch (err) {
    console.error(err);
  }
  res.send("Success");
});

async function getText(reference) {
  const keyArr = reference.split(/[+:-]/);
  const book = keyArr[0].toLowerCase();
  const chapter = keyArr[1];
  const firstVerse = keyArr[2];
  const lastVerse = keyArr.length > 3 ? keyArr[3] : firstVerse;

  const response = await axiosInstance.get(`/verses/ra/${book}/${chapter}`);
  const chp = response.data;
  let finalText = "";
  chp.verses.forEach((v) => {
    if (v.number >= firstVerse && v.number <= lastVerse) {
      finalText += `*${v.number}* ${v.text} `;
    }
  });
  return finalText;
}

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
  const lastVerse = keyArr.length > 3 ? keyArr[3] : firstVerse;

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
