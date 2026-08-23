import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./CollectionPage.css";

import {
  useCart,
} from "./CartContext";


const API_URL =
  "http://127.0.0.1:8000";


/* ========================================================= */
/* TYPES */
/* ========================================================= */

type ProductImage = {
  id: number;
  image_url: string;
  position: number;
};


type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  description: string;
  material: string;
  dimensions: string;
  colors: string[];
  stock: number;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  main_image: string | null;
  images: ProductImage[];
};


type SortMode =
  | "signature"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name";


type StockFilter =
  | "all"
  | "available"
  | "sold-out";


/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

function CollectionPage() {

  const {
    cartCount,
    addItem,
  } = useCart();


  /* ======================================================= */
  /* URL INITIAL VALUES */
  /* ======================================================= */

  const initialParams =
    new URLSearchParams(
      window.location.search
    );


  const currentPath =
    window.location.pathname
      .replace(
        /\/+$/,
        ""
      ) || "/";


  const categoryByPath:
    Record<string, string> = {
      "/collection/sacs-a-main":
        "Sacs à main",

      "/collection/mini-sacs":
        "Mini sacs",

      "/collection/portefeuilles":
        "Portefeuilles",

      "/collection/petite-maroquinerie":
        "Petite maroquinerie",

      "/collection/accessoires":
        "Accessoires",

      "/collection/sacs":
        "Sacs",
    };


  const pathByCategory:
    Record<string, string> = {
      "Sacs à main":
        "/collection/sacs-a-main",

      "Mini sacs":
        "/collection/mini-sacs",

      "Portefeuilles":
        "/collection/portefeuilles",

      "Petite maroquinerie":
        "/collection/petite-maroquinerie",

      "Accessoires":
        "/collection/accessoires",

      "Sacs":
        "/collection/sacs",
    };


  const initialCategory =
    initialParams.get(
      "category"
    ) ||
    categoryByPath[
      currentPath
    ] ||
    "Tous";


  const initialNewOnly =
    initialParams.get(
      "new"
    ) === "1" ||
    currentPath ===
      "/nouveautes";


  /* ======================================================= */
  /* STATE */
  /* ======================================================= */

  const [
    products,
    setProducts,
  ] = useState<Product[]>(
    []
  );


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    category,
    setCategory,
  ] = useState(
    initialCategory
  );


  const [
    stockFilter,
    setStockFilter,
  ] =
    useState<StockFilter>(
      "all"
    );


  const [
    newOnly,
    setNewOnly,
  ] = useState(
    initialNewOnly
  );


  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "signature"
    );


  const [
    selectedColors,
    setSelectedColors,
  ] = useState<
    Record<number, string>
  >({});


  const [
    addedProductId,
    setAddedProductId,
  ] = useState<
    number | null
  >(null);


  /* ======================================================= */
  /* LOAD PRODUCTS */
  /* ======================================================= */

  useEffect(() => {

    const loadProducts =
      async () => {

        try {

          setLoading(
            true
          );

          setError(
            ""
          );


          const response =
            await fetch(
              `${API_URL}/api/products`
            );


          if (
            !response.ok
          ) {

            throw new Error(
              "Impossible de charger la collection."
            );

          }


          const data:
            Product[] =
            await response.json();


          setProducts(
            data
          );


          const defaultColors:
            Record<
              number,
              string
            > = {};


          data.forEach(
            product => {

              defaultColors[
                product.id
              ] =
                product.colors[0] ||
                "";

            }
          );


          setSelectedColors(
            defaultColors
          );

        } catch {

          setError(
            "Impossible de contacter la boutique ELIO."
          );

        } finally {

          setLoading(
            false
          );

        }

      };


    loadProducts();

  }, []);


  /* ======================================================= */
  /* HELPERS */
  /* ======================================================= */

  const imageUrl = (
    url: string | null
  ) => {

    if (!url) {

      return "";

    }


    if (
      url.startsWith(
        "http"
      )
    ) {

      return url;

    }


    return `${API_URL}${url}`;

  };


  const formatPrice = (
    price: number
  ) => {

    return new Intl.NumberFormat(
      "fr-TN",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          3,
      }
    ).format(
      price
    );

  };


  /* ======================================================= */
  /* CATEGORIES */
  /* ======================================================= */

  const categories =
    useMemo(
      () => {

        const uniqueCategories =
          Array.from(
            new Set(
              products
                .map(
                  product =>
                    product.category
                )
                .filter(
                  categoryName =>
                    Boolean(
                      categoryName
                    )
                )
            )
          );


        return [
          "Tous",
          ...uniqueCategories,
        ];

      },
      [
        products,
      ]
    );


  /* ======================================================= */
  /* CATEGORY VALIDATION */
  /* ======================================================= */

  useEffect(() => {

    if (
      category !==
        "Tous" &&
      products.length >
        0 &&
      !categories.includes(
        category
      )
    ) {

      setCategory(
        "Tous"
      );

    }

  }, [
    category,
    categories,
    products.length,
  ]);


  /* ======================================================= */
  /* URL SYNC */
  /* ======================================================= */

  useEffect(() => {

    const params =
      new URLSearchParams();


    let basePath =
      "/collection";


    if (
      category !==
      "Tous"
    ) {

      const categoryPath =
        pathByCategory[
          category
        ];


      if (
        categoryPath
      ) {

        basePath =
          categoryPath;

      } else {

        params.set(
          "category",
          category
        );

      }

    }


    if (
      newOnly
    ) {

      if (
        category ===
        "Tous"
      ) {

        basePath =
          "/nouveautes";

      } else {

        params.set(
          "new",
          "1"
        );

      }

    }


    const query =
      params.toString();


    const newUrl =
      `${basePath}${
        query
          ? `?${query}`
          : ""
      }`;


    window.history.replaceState(
      {},
      "",
      newUrl
    );

  }, [
    category,
    newOnly,
  ]);


  /* ======================================================= */
  /* STOCK FILTER CHANGE */
  /* ======================================================= */

  const handleStockFilterChange =
    (
      value: string
    ) => {

      if (
        value ===
        "available"
      ) {

        setStockFilter(
          "available"
        );

        return;

      }


      if (
        value ===
        "sold-out"
      ) {

        setStockFilter(
          "sold-out"
        );

        return;

      }


      setStockFilter(
        "all"
      );

    };


  /* ======================================================= */
  /* SORT CHANGE */
  /* ======================================================= */

  const handleSortChange =
    (
      value: string
    ) => {

      if (
        value ===
        "newest"
      ) {

        setSortMode(
          "newest"
        );

        return;

      }


      if (
        value ===
        "price-asc"
      ) {

        setSortMode(
          "price-asc"
        );

        return;

      }


      if (
        value ===
        "price-desc"
      ) {

        setSortMode(
          "price-desc"
        );

        return;

      }


      if (
        value ===
        "name"
      ) {

        setSortMode(
          "name"
        );

        return;

      }


      setSortMode(
        "signature"
      );

    };


  /* ======================================================= */
  /* FILTER PRODUCTS */
  /* ======================================================= */

  const filteredProducts =
    useMemo(
      () => {

        const filtered =
          products.filter(
            product => {

              const categoryMatch =
                category ===
                  "Tous" ||
                product.category ===
                  category;


              let stockMatch =
                true;


              if (
                stockFilter ===
                "available"
              ) {

                stockMatch =
                  product.stock >
                  0;

              }


              if (
                stockFilter ===
                "sold-out"
              ) {

                stockMatch =
                  product.stock <=
                  0;

              }


              const newMatch =
                !newOnly ||
                product.is_new;


              return (
                categoryMatch &&
                stockMatch &&
                newMatch
              );

            }
          );


        const sorted =
          [
            ...filtered,
          ];


        if (
          sortMode ===
          "newest"
        ) {

          sorted.sort(
            (
              productA,
              productB
            ) =>
              productB.id -
              productA.id
          );

        }


        if (
          sortMode ===
          "price-asc"
        ) {

          sorted.sort(
            (
              productA,
              productB
            ) =>
              productA.price -
              productB.price
          );

        }


        if (
          sortMode ===
          "price-desc"
        ) {

          sorted.sort(
            (
              productA,
              productB
            ) =>
              productB.price -
              productA.price
          );

        }


        if (
          sortMode ===
          "name"
        ) {

          sorted.sort(
            (
              productA,
              productB
            ) =>
              productA.name.localeCompare(
                productB.name,
                "fr"
              )
          );

        }


        if (
          sortMode ===
          "signature"
        ) {

          sorted.sort(
            (
              productA,
              productB
            ) => {

              const featuredDifference =
                Number(
                  productB.is_featured
                ) -
                Number(
                  productA.is_featured
                );


              if (
                featuredDifference !==
                0
              ) {

                return featuredDifference;

              }


              const newDifference =
                Number(
                  productB.is_new
                ) -
                Number(
                  productA.is_new
                );


              if (
                newDifference !==
                0
              ) {

                return newDifference;

              }


              return (
                productB.id -
                productA.id
              );

            }
          );

        }


        return sorted;

      },
      [
        products,
        category,
        stockFilter,
        newOnly,
        sortMode,
      ]
    );


  /* ======================================================= */
  /* COLOR */
  /* ======================================================= */

  const chooseColor = (
    productId: number,
    color: string
  ) => {

    setSelectedColors(
      previous => ({
        ...previous,

        [productId]:
          color,
      })
    );

  };


  /* ======================================================= */
  /* ADD TO CART */
  /* ======================================================= */

  const addToCart = (
    product: Product
  ) => {

    if (
      product.stock <=
      0
    ) {

      return;

    }


    const color =
      selectedColors[
        product.id
      ] ||
      product.colors[0] ||
      "";


    addItem(
      product.id,
      color,
      1,
      product.stock
    );


    setAddedProductId(
      product.id
    );


    window.setTimeout(
      () => {

        setAddedProductId(
          current =>
            current ===
              product.id
              ? null
              : current
        );

      },
      1800
    );

  };


  /* ======================================================= */
  /* RESET FILTERS */
  /* ======================================================= */

  const resetFilters =
    () => {

      setCategory(
        "Tous"
      );

      setStockFilter(
        "all"
      );

      setNewOnly(
        false
      );

      setSortMode(
        "signature"
      );

    };


  const filtersActive =
    category !==
      "Tous" ||
    stockFilter !==
      "all" ||
    newOnly ||
    sortMode !==
      "signature";


  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (

    <div className="collection-page">


      {/* =================================================== */}
      {/* ANNOUNCEMENT */}
      {/* =================================================== */}

      <div className="collection-announcement">

        Livraison disponible dans toute la Tunisie

      </div>


      {/* =================================================== */}
      {/* HEADER */}
      {/* =================================================== */}

      <header className="collection-page-header">


        <nav className="collection-page-nav collection-page-nav-left">


          <a
            href="/nouveautes"
            className={
              newOnly
                ? "collection-current-link"
                : undefined
            }
          >

            Nouveautés

          </a>


          <a
            href="/collection/sacs-a-main"
            className={
              category ===
                "Sacs à main" &&
              !newOnly
                ? "collection-current-link"
                : undefined
            }
          >

            Sacs

          </a>


          <a
            href="/collection"
            className={
              category ===
                "Tous" &&
              !newOnly
                ? "collection-current-link"
                : undefined
            }
          >

            Collection

          </a>


        </nav>


        <a
          href="/"
          className="collection-page-logo"
        >

          <img
            src="/elio-logo-transparent.png"
            alt="ELIO Maroquinerie"
          />

        </a>


        <nav className="collection-page-nav collection-page-nav-right">


          <a href="/#maison">

            Maison ELIO

          </a>


          <a href="/?search=1">

            Recherche

          </a>


          <a
            href="/?openCart=1"
            className="collection-page-cart"
          >

            Panier


            <span>

              {
                cartCount
              }

            </span>

          </a>


        </nav>


      </header>


      {/* =================================================== */}
      {/* MAIN */}
      {/* =================================================== */}

      <main>


        {/* ================================================= */}
        {/* HERO */}
        {/* ================================================= */}

        <section className="collection-page-hero">


          <p>

            COLLECTION ELIO · 2026

          </p>


          <h1>

            Toutes

            <br />

            les pièces.

          </h1>


          <span>

            Découvrez l'ensemble de la collection ELIO,
            imaginée autour d'une esthétique élégante,
            contemporaine et intemporelle.

          </span>


        </section>


        {/* ================================================= */}
        {/* FILTERS */}
        {/* ================================================= */}

        <section className="collection-filter-section">


          {/* CATEGORIES */}

          <div className="collection-categories">


            {
              categories.map(
                categoryName => (

                  <button
                    key={
                      categoryName
                    }
                    type="button"
                    className={
                      category ===
                      categoryName
                        ? "collection-category-selected"
                        : ""
                    }
                    onClick={() =>
                      setCategory(
                        categoryName
                      )
                    }
                  >

                    {
                      categoryName
                    }

                  </button>

                )
              )
            }


          </div>


          {/* FILTER BAR */}

          <div className="collection-filter-bar">


            <div className="collection-filter-left">


              {/* STOCK */}

              <label className="collection-select-label">


                <span>

                  Disponibilité

                </span>


                <select
                  value={
                    stockFilter
                  }
                  onChange={
                    event =>
                      handleStockFilterChange(
                        event.target.value
                      )
                  }
                >

                  <option value="all">

                    Tous

                  </option>


                  <option value="available">

                    En stock

                  </option>


                  <option value="sold-out">

                    Rupture

                  </option>


                </select>


              </label>


              {/* NEW ONLY */}

              <label className="collection-checkbox">


                <input
                  type="checkbox"
                  checked={
                    newOnly
                  }
                  onChange={
                    event =>
                      setNewOnly(
                        event.target.checked
                      )
                  }
                />


                <span>

                  Nouveautés uniquement

                </span>


              </label>


            </div>


            <div className="collection-filter-right">


              <span className="collection-result-count">

                {
                  filteredProducts.length
                }{" "}

                pièce

                {
                  filteredProducts.length !==
                    1
                    ? "s"
                    : ""
                }

              </span>


              {/* SORT */}

              <label className="collection-select-label">


                <span>

                  Trier par

                </span>


                <select
                  value={
                    sortMode
                  }
                  onChange={
                    event =>
                      handleSortChange(
                        event.target.value
                      )
                  }
                >

                  <option value="signature">

                    Sélection ELIO

                  </option>


                  <option value="newest">

                    Plus récents

                  </option>


                  <option value="price-asc">

                    Prix croissant

                  </option>


                  <option value="price-desc">

                    Prix décroissant

                  </option>


                  <option value="name">

                    Nom A–Z

                  </option>


                </select>


              </label>


              {
                filtersActive && (

                  <button
                    type="button"
                    className="collection-clear-filters"
                    onClick={
                      resetFilters
                    }
                  >

                    Effacer

                  </button>

                )
              }


            </div>


          </div>


        </section>


        {/* ================================================= */}
        {/* PRODUCTS */}
        {/* ================================================= */}

        <section className="collection-products">


          {/* LOADING */}

          {
            loading && (

              <div className="collection-status">


                <div className="collection-loader"></div>


                <p>

                  Chargement de la collection...

                </p>


              </div>

            )
          }


          {/* ERROR */}

          {
            !loading &&
            error && (

              <div className="collection-status">


                <span className="collection-status-logo">

                  ELIO

                </span>


                <h2>

                  Collection indisponible.

                </h2>


                <p>

                  {
                    error
                  }

                </p>


              </div>

            )
          }


          {/* EMPTY */}

          {
            !loading &&
            !error &&
            filteredProducts.length ===
              0 && (

              <div className="collection-status">


                <span className="collection-status-logo">

                  ELIO

                </span>


                <h2>

                  Aucune pièce trouvée.

                </h2>


                <p>

                  Modifiez les filtres pour découvrir
                  d'autres créations ELIO.

                </p>


                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                >

                  Voir toute la collection

                </button>


              </div>

            )
          }


          {/* GRID */}

          {
            !loading &&
            !error &&
            filteredProducts.length >
              0 && (

              <div className="collection-grid">


                {
                  filteredProducts.map(
                    product => {

                      const selectedColor =
                        selectedColors[
                          product.id
                        ] ||
                        product.colors[0] ||
                        "";


                      return (

                        <article
                          className="collection-card"
                          key={
                            product.id
                          }
                        >


                          {/* ================================= */}
                          {/* IMAGE */}
                          {/* ================================= */}

                          <a
                            href={`/produit/${product.slug}`}
                            className="collection-card-image"
                          >


                            {
                              product.main_image ? (

                                <img
                                  src={
                                    imageUrl(
                                      product.main_image
                                    )
                                  }
                                  alt={
                                    product.name
                                  }
                                  loading="lazy"
                                />

                              ) : (

                                <div className="collection-card-placeholder">


                                  <span>

                                    ELIO

                                  </span>


                                  <small>

                                    Photo à venir

                                  </small>


                                </div>

                              )
                            }


                            {/* BADGES */}

                            <div className="collection-card-badges">


                              {
                                product.is_new && (

                                  <span>

                                    Nouveau

                                  </span>

                                )
                              }


                              {
                                product.is_featured && (

                                  <span>

                                    Signature

                                  </span>

                                )
                              }


                            </div>


                            {
                              product.stock <=
                                0 && (

                                <span className="collection-card-sold-out">

                                  Rupture

                                </span>

                              )
                            }


                          </a>


                          {/* ================================= */}
                          {/* CONTENT */}
                          {/* ================================= */}

                          <div className="collection-card-content">


                            <p className="collection-card-category">

                              {
                                product.category
                              }

                            </p>


                            <div className="collection-card-heading">


                              <h2>


                                <a
                                  href={`/produit/${product.slug}`}
                                >

                                  {
                                    product.name
                                  }

                                </a>


                              </h2>


                              <div className="collection-card-price">


                                {
                                  product.compare_at_price &&
                                  product.compare_at_price >
                                    product.price && (

                                    <del>

                                      {
                                        formatPrice(
                                          product.compare_at_price
                                        )
                                      }{" "}

                                      TND

                                    </del>

                                  )
                                }


                                <strong>

                                  {
                                    formatPrice(
                                      product.price
                                    )
                                  }{" "}

                                  TND

                                </strong>


                              </div>


                            </div>


                            {/* DESCRIPTION */}

                            {
                              product.description && (

                                <p className="collection-card-description">

                                  {
                                    product.description.length >
                                      120
                                      ? `${product.description.slice(
                                          0,
                                          120
                                        )}...`
                                      : product.description
                                  }

                                </p>

                              )
                            }


                            {/* COLORS */}

                            {
                              product.colors.length >
                                0 && (

                                <div className="collection-card-color-area">


                                  <div className="collection-color-heading">


                                    <span>

                                      Couleur

                                    </span>


                                    <strong>

                                      {
                                        selectedColor
                                      }

                                    </strong>


                                  </div>


                                  <div className="collection-color-options">


                                    {
                                      product.colors.map(
                                        color => (

                                          <button
                                            type="button"
                                            key={
                                              color
                                            }
                                            className={
                                              selectedColor ===
                                              color
                                                ? "collection-color-active"
                                                : ""
                                            }
                                            onClick={() =>
                                              chooseColor(
                                                product.id,
                                                color
                                              )
                                            }
                                          >

                                            {
                                              color
                                            }

                                          </button>

                                        )
                                      )
                                    }


                                  </div>


                                </div>

                              )
                            }


                            {/* STOCK */}

                            <div className="collection-stock">


                              {
                                product.stock >
                                  0 ? (

                                  <span className="collection-stock-available">

                                    {
                                      product.stock
                                    }{" "}

                                    en stock

                                  </span>

                                ) : (

                                  <span className="collection-stock-empty">

                                    Rupture de stock

                                  </span>

                                )
                              }


                            </div>


                            {/* ADD */}

                            <button
                              type="button"
                              className={
                                addedProductId ===
                                product.id
                                  ? "collection-add collection-add-success"
                                  : "collection-add"
                              }
                              disabled={
                                product.stock <=
                                0
                              }
                              onClick={() =>
                                addToCart(
                                  product
                                )
                              }
                            >

                              {
                                addedProductId ===
                                  product.id
                                  ? "✓ Ajouté au panier"

                                  : product.stock >
                                      0
                                    ? "Ajouter au panier"

                                    : "Indisponible"
                              }

                            </button>


                            {/* VIEW PRODUCT */}

                            <a
                              href={`/produit/${product.slug}`}
                              className="collection-view-product"
                            >

                              Voir le produit

                              <span>

                                →

                              </span>

                            </a>


                          </div>


                        </article>

                      );

                    }
                  )
                }


              </div>

            )
          }


        </section>


        {/* ================================================= */}
        {/* BRAND SECTION */}
        {/* ================================================= */}

        <section className="collection-brand-section">


          <p>

            MAISON ELIO

          </p>


          <h2>

            L'élégance

            <br />

            dans chaque détail.

          </h2>


          <span>

            Des pièces pensées pour accompagner
            chaque instant avec simplicité,
            caractère et sophistication.

          </span>


          <a href="/#maison">

            Découvrir la Maison ELIO

            <b>

              →

            </b>

          </a>


        </section>


      </main>


      {/* =================================================== */}
      {/* FOOTER */}
      {/* =================================================== */}

      <footer className="collection-page-footer">


        <div className="collection-footer-brand">


          <img
            src="/elio-logo-transparent.png"
            alt="ELIO Maroquinerie"
          />


          <p>

            Maroquinerie contemporaine.

            <br />

            Tunisie · Depuis 2026.

          </p>


        </div>


        <div>


          <strong>

            Boutique

          </strong>


          <a href="/collection">

            Collection

          </a>


          <a href="/nouveautes">

            Nouveautés

          </a>


          <a href="/collection/sacs-a-main">

            Sacs

          </a>


        </div>


        <div>


          <strong>

            ELIO

          </strong>


          <a href="/#maison">

            Maison ELIO

          </a>


          <a href="/">

            Accueil

          </a>


        </div>


        <div>


          <strong>

            Service

          </strong>


          <a href="/?openCart=1">

            Panier

          </a>


          <a href="/?search=1">

            Recherche

          </a>


          <a href="/contact">

            Contact

          </a>


          <a href="/faq">

            F.A.Q

          </a>


          <a href="/retours">

            Retours & échanges

          </a>


        </div>


      </footer>


    </div>

  );

}


export default CollectionPage;