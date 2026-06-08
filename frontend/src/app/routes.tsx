import { createBrowserRouter } from "react-router";
import { MainView } from "./views/MainView";
import { CountryView } from "./views/CountryView";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: MainView },
      { path: "country/:countryCode", Component: CountryView },
      { path: "*", Component: MainView },
    ],
  },
]);
