import { createBrowserRouter } from "react-router";
import App from "./App";
import { HomePage } from "./pages/HomePage";
import { FontFamilyPage } from "./pages/FontFamilyPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "family/:familyName",
        element: <FontFamilyPage />,
      },
    ],
  },
]);
