import { createBrowserRouter } from "react-router";
import { MainView } from "./views/MainView";
import { CountryView } from "./views/CountryView";
import { ContactView } from "./views/ContactView";
import { LegalDisclaimerView } from "./views/LegalDisclaimerView";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: MainView },
      { path: "country/:countryCode", Component: CountryView },
      { path: "contact", Component: ContactView },
      { path: "legal-disclaimer", Component: LegalDisclaimerView },
      { path: "*", Component: MainView },
    ],
  },
]);
