const firebaseConfig = {
  "apiKey": "AIzaSyCaho0PsOQtT3qboSVdhV4mdEiGk1JOFg4",
  "authDomain": "wb-analyser.firebaseapp.com",
  "projectId": "wb-analyser",
  "storageBucket": "wb-analyser.firebasestorage.app",
  "messagingSenderId": "247021047917",
  "appId": "1:247021047917:web:0a5fafb3c922e2cb462f64",
  "measurementId": "G-5GH20RFFTD"
}
;
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { addContainer } from "./index.js";

let isAuth = true;
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const analytics = getAnalytics(app);

const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const authButton = document.getElementById("authButton");
const statusMsg = document.getElementById("statusMsg");
const calcContainer = document.getElementById("calcContainer");
const authContainer = document.getElementById("authContainer");
const authUserInfo = document.getElementById("authUserInfo");
const authUserLogin = document.getElementById("authUserLogin");
const historyContainer = document.getElementById("history");
const authModeLink = document.getElementById("authModeLink");
const finalResult = document.getElementById("finalResult");

const authModeLabel = document.getElementById("authModeLabel");
const passwordConfirm = document.getElementById("passwordConfirm");
const authTitle = document.getElementById("authTitle");
const authUserTokens = document.getElementById("authUserTokens");

export const db = getFirestore();

console.log("auth", auth);

async function registerAndAddCredits(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User registered in Firebase Authentication:", user.uid);
    const userDocRef = doc(db, "users", user.uid); // Reference to the user's document using their UID
    await setDoc(userDocRef, {
      email: user.email,
      credits: 3,
      createdAt: new Date(),
    });

    console.log("User document created in Firestore with initial credits for:", user.uid);
    return user;
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.error("Error during user registration or credit assignment:", errorCode, errorMessage);
    throw error;
  }
}

async function getTokens(userId) {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      console.log("Document data:", userDocSnap.data());
      window.tokens = userDocSnap.data().credits;
      authUserTokens.innerText = `${window.tokens} 🪙`;
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.error("Error getting user document:", error);
    throw error;
  }
}

authButton.onclick = async () => {
  if (isAuth) {
    signInWithEmailAndPassword(auth, emailInput.value, passInput.value)
      .catch((err) => (statusMsg.innerText = "Ошибка: " + err.message))
      .then(async () => {
        await getTokens(auth.currentUser.uid);
      });
  } else {
    await registerAndAddCredits(emailInput.value, passInput.value)
      .catch((err) => (statusMsg.innerText = "Ошибка: " + err.message))
      .then(async () => {
        await getTokens(auth.currentUser.uid);
      });
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
  if (window.tokens) {
    authUserTokens.innerText = `${window.tokens} 🪙`;
  }
  authContainer.style.display = "none";
  authButton.style.display = "none";
  emailInput.style.display = "none";
  historyContainer.innerHTML = `<div class="container shadow-deep"><button onclick="getReports()" /> Получить отчеты </button></div>`;
  passInput.style.display = "none";
  statusMsg.innerText = "";
  addContainer();
};

const logountChange = () => {
  authUserInfo.style.display = "none";
  authUserLogin.innerText = "";
  authUserTokens.innerText = "";
  historyContainer.innerHTML = "";
  authContainer.style.display = "block";
  authButton.style.display = "inline-block";
  finalResult.innerHTML = "";
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
