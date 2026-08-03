import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider, type AuthProviderProps } from "react-oidc-context";
import "./index.css";
import App from "./App.tsx";
import { oidcConfig } from "./configs/authConfig";
import "./configs/i18nConfig";

const onSigninCallback: AuthProviderProps["onSigninCallback"] = () => {
  window.history.replaceState({}, document.title, "/");
};

createRoot(document.getElementById("root")!).render(
  <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>,
);
