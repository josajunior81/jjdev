module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: ["plugin:prettier/recommended"],
  plugins: ["prettier"],

  rules: {
    "prettier/prettier": "error",
  },
};
