import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import "./index.css";

import App from "./App";

import AdminPage
  from "./admin/AdminPage";

import ProductPage
  from "./store/ProductPage";

import CollectionPage
  from "./store/CollectionPage";

import GlobalSearch
  from "./store/GlobalSearch";

import InfoPage
  from "./pages/InfoPage";

import {
  CartProvider,
} from "./store/CartContext";


const path =
  window.location.pathname
    .replace(
      /\/+$/,
      ""
    ) || "/";


const isAdmin =
  path.startsWith(
    "/admin"
  );


const isProductPage =
  path.startsWith(
    "/produit/"
  );


const isCollectionPage =
  path ===
    "/nouveautes" ||
  path ===
    "/collection" ||
  path.startsWith(
    "/collection/"
  );


const infoPages =
  new Set(
    [
      "/contact",
      "/faq",
      "/retours",
      "/confidentialite",
      "/conditions-generales",
    ]
  );


const isInfoPage =
  infoPages.has(
    path
  );


let application;


if (
  isAdmin
) {

  application =
    <AdminPage />;

} else if (
  isProductPage
) {

  application =
    <ProductPage />;

} else if (
  isCollectionPage
) {

  application =
    <CollectionPage />;

} else if (
  isInfoPage
) {

  application =
    <InfoPage />;

} else {

  application =
    <App />;

}


createRoot(
  document.getElementById(
    "root"
  )!
).render(

  <StrictMode>

    <CartProvider>

      {
        application
      }

      {
        !isAdmin && (
          <GlobalSearch />
        )
      }

    </CartProvider>

  </StrictMode>

);