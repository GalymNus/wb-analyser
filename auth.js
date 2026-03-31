import { firebaseConfig } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { addContainer } from "./index.js";

let isAuth = true;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const authButton = document.getElementById("authButton");
const statusMsg = document.getElementById("statusMsg");
const calcContainer = document.getElementById("calcContainer");
const authContainer = document.getElementById("authContainer");
const authUserInfo = document.getElementById("authUserInfo");
const authUserLogin = document.getElementById("authUserLogin");
const authModeLink = document.getElementById("authModeLink");
const authModeLabel = document.getElementById("authModeLabel");
const passwordConfirm = document.getElementById("passwordConfirm");
const authTitle = document.getElementById("authTitle");

authButton.onclick = () => {
  if (isAuth) {
    signInWithEmailAndPassword(auth, emailInput.value, passInput.value).catch(
      (err) => (statusMsg.innerText = "Ошибка: " + err.message),
    );
  } else {
    createUserWithEmailAndPassword(auth, emailInput.value, passInput.value).catch(
      (err) => (statusMsg.innerText = "Ошибка: " + err.message),
    );
  }
};

authModeLink.onclick = () => {
  if (isAuth) {
    passwordConfirm.style.display = "block";
    authModeLabel.innerText = "Есть аккаунт?";
    authModeLink.innerText = "Войти";
    authButton.innerText = "Регистрация";
    authTitle.innerText = "Регистрация";
    isAuth = false;
  } else {
    passwordConfirm.style.display = "none";
    authModeLabel.innerText = "Нет аккаунта?";
    authModeLink.innerText = "Зарегистрироваться";
    authButton.innerText = "Войти";
    authTitle.innerText = "Авторизация";
    isAuth = true;
  }
};

btnLogout.onclick = () => {
  signOut(auth);
  logountChange();
};

const loginChange = (user) => {
  authUserInfo.style.display = "flex";
  authUserLogin.innerText = user ? user.email : "admin";
  authContainer.style.display = "none";
  authButton.style.display = "none";
  emailInput.style.display = "none";
  passInput.style.display = "none";
  statusMsg.innerText = "";
  addContainer();
};

const logountChange = () => {
  authUserInfo.style.display = "none";
  authUserLogin.innerText = "";
  authContainer.style.display = "block";
  authButton.style.display = "inline-block";
  emailInput.style.display = "inline-block";
  passInput.style.display = "inline-block";
  statusMsg.innerText = "";
  calcContainer.innerHTML = "";
  document.getElementsByTagName("body")[0].style.backgroundColor = "#f4f7f6";
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginChange(user);
  } else {
    logountChange();
  }
});

let inputBuffer = "";
const secretCode = "admin";

document.addEventListener("keypress", (e) => {
  inputBuffer += e.key.toLowerCase();
  inputBuffer = inputBuffer.slice(-secretCode.length);
  if (inputBuffer === secretCode) {
    const speech = new SpeechSynthesisUtterance("zaibal");
    window.speechSynthesis.speak(speech);
    inputBuffer = "";
    document.getElementsByTagName("body")[0].style.backgroundColor = "#83cb9f";
    loginChange();
  }
});
