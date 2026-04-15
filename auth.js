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

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const btnLogout = document.getElementById("btnLogout");

export const db = getFirestore();

console.log("auth", auth);

function validateAuthInputs() {
  const email = emailInput.value.trim();
  const password = passInput.value;
  const confirmPassword = passwordConfirm.value;

  if (!email || !password) {
    throw new Error("Email и пароль обязательны");
  }

  if (!isAuth) {
    if (!confirmPassword) {
      throw new Error("Подтвердите пароль");
    }
    if (password !== confirmPassword) {
      throw new Error("Пароли не совпадают");
    }
  }

  return { email, password };
}

async function registerAndAddCredits(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User registered in Firebase Authentication:", user.uid);
    const userDocRef = doc(db, "users", user.uid); // Reference to the user's document using their UID
    await setDoc(userDocRef, {
      email: user.email,
      credits: 8,
      createdAt: serverTimestamp(),
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

export async function getTokens(userId) {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      localStorage.setItem("tokens", userDocSnap.data().credits);
      return userDocSnap.data().credits;
    } else {
      console.log("No such document!");
      return 0;
    }
  } catch (error) {
    console.error("Error getting user document:", error);
    throw error;
  }
}

authButton.onclick = async () => {
  try {
    statusMsg.innerText = "";
    const { email, password } = validateAuthInputs();

    if (isAuth) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await registerAndAddCredits(email, password);
      passwordConfirm.value = "";
    }

    if (auth.currentUser?.uid) {
      await getTokens(auth.currentUser.uid);
    }
  } catch (err) {
    statusMsg.innerText = "Ошибка: " + err.message;
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
  authUserTokens.innerText = localStorage.getItem("tokens") ? `${localStorage.getItem("tokens")} 🪙` : "";
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
