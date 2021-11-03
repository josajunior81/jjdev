const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

async function getDailyReadingText(
  axiosInstance,
  version = "acf",
  date = new Date()
) {
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
    return "Nada pra hoje";
  }

  const theme = await doc.data().themeRef.get();
  let questions = "";

  for (let i = 0; i < theme.data().questions.length; i++) {
    questions += `${i + 1}. ${theme.data().questions[i]}<br>`;
  }

  let texts = "";

  for (const t of doc.data().text) {
    const verse = await getText(version, t, axiosInstance);
    texts += `*${t.replace("+", " ")}*<br>${verse}<br><br>`;
  }

  return `*${theme.id} - ${theme.data().title}*
    <br>
    \`\`\`${questions}\`\`\`
    <br>
    ${texts}`;
}

async function getText(version, reference, axiosInstance) {
  const keyArr = reference.split(/[+:]/);
  const book = keyArr[0].toLowerCase();
  const chapter = keyArr[1];

  const response = await axiosInstance.get(
    `/verses/${version}/${book}/${chapter}`
  );

  const verses =
    keyArr.length >= 3
      ? keyArr[2].split(";")
      : [`1-${response.data.chapter.verses}`];

  const contiguousVerses = verses.filter((f) => f.includes("-"));
  const singleVerses = verses.filter((f) => !f.includes("-"));

  let chosenVerses = [];
  if (contiguousVerses.length > 0) {
    contiguousVerses.forEach((e) => {
      let cv = e.split("-");
      for (let i = parseInt(cv[0]); i <= parseInt(cv[1]); i++) {
        chosenVerses.push(i);
      }
    });
  }

  chosenVerses.push(...singleVerses);

  chosenVerses.sort((a, b) => a - b);

  const chp = response.data;
  let finalText = "";
  chp.verses.forEach((v) => {
    if (chosenVerses.some((e) => e == v.number)) {
      finalText += `<strong>${v.number}</strong> ${v.text} `;
    }
  });
  return finalText;
}

async function saveCalendar(texts, themes) {
  const themesData = themes.toString();
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

  try {
    const data = texts.toString();

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
}

module.exports = { getDailyReadingText, getText, saveCalendar };
