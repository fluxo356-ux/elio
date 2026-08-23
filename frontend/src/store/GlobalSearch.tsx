import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import "./GlobalSearch.css";


const API_URL =
  "http://127.0.0.1:8000";


/* ========================================================= */
/* TYPES */
/* ========================================================= */

type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number;
  compare_at_price:
    | number
    | null;
  description: string;
  material: string;
  dimensions: string;
  colors: string[];
  stock: number;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  main_image:
    | string
    | null;
};


/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function normalizeText(
  value: string
) {

  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();

}


/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

function GlobalSearch() {

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );


  const [
    products,
    setProducts,
  ] =
    useState<Product[]>(
      []
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    error,
    setError,
  ] =
    useState(
      ""
    );


  const [
    query,
    setQuery,
  ] =
    useState(
      ""
    );


  const [
    productHeaderTarget,
    setProductHeaderTarget,
  ] =
    useState<Element | null>(
      null
    );


  const inputRef =
    useRef<HTMLInputElement>(
      null
    );


  /* ======================================================= */
  /* LOAD PRODUCTS */
  /* ======================================================= */

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
            "Impossible de charger les produits."
          );

        }


        const data:
          Product[] =
          await response.json();


        setProducts(
          data
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


  useEffect(
    () => {

      void loadProducts();

    },
    []
  );


  /* ======================================================= */
  /* FIND PRODUCT PAGE HEADER */
  /* ======================================================= */

  useEffect(
    () => {

      const findTarget =
        () => {

          const target =
            document.querySelector(
              ".product-header-right"
            );


          setProductHeaderTarget(
            target
          );

        };


      findTarget();


      const observer =
        new MutationObserver(
          findTarget
        );


      observer.observe(
        document.body,
        {
          childList: true,
          subtree: true,
        }
      );


      return () => {

        observer.disconnect();

      };

    },
    []
  );


  /* ======================================================= */
  /* OPEN FROM ?search=1 */
  /* ======================================================= */

  useEffect(
    () => {

      const params =
        new URLSearchParams(
          window.location.search
        );


      if (
        params.get(
          "search"
        ) !==
        "1"
      ) {

        return;

      }


      setOpen(
        true
      );


      params.delete(
        "search"
      );


      const newQuery =
        params.toString();


      const cleanUrl =
        `${window.location.pathname}` +
        `${newQuery ? `?${newQuery}` : ""}` +
        `${window.location.hash}`;


      window.history.replaceState(
        {},
        "",
        cleanUrl
      );

    },
    []
  );


  /* ======================================================= */
  /* LISTEN TO SEARCH TRIGGERS */
  /* ======================================================= */

  useEffect(
    () => {

      const handleClick =
        (
          event:
            MouseEvent
        ) => {

          const target =
            event.target as
              HTMLElement;


          /*
            Ignore clicks that happen
            inside the search window.
          */

          if (
            target.closest(
              ".elio-global-search-overlay"
            )
          ) {

            return;

          }


          /*
            Explicit ELIO search trigger.
          */

          const explicitTrigger =
            target.closest(
              "[data-elio-search-trigger]"
            );


          if (
            explicitTrigger
          ) {

            event.preventDefault();

            setOpen(
              true
            );

            return;

          }


          /*
            Existing buttons whose visible
            label is Recherche.
          */

          const button =
            target.closest(
              "button"
            );


          if (
            button
          ) {

            const text =
              normalizeText(
                button.textContent ||
                  ""
              );


            if (
              text ===
              "recherche"
            ) {

              event.preventDefault();

              setOpen(
                true
              );

              return;

            }

          }


          /*
            Search links using ?search=1.
          */

          const link =
            target.closest(
              "a"
            ) as
              HTMLAnchorElement |
              null;


          if (
            link &&
            link.href.includes(
              "search=1"
            )
          ) {

            event.preventDefault();

            setOpen(
              true
            );

          }

        };


      document.addEventListener(
        "click",
        handleClick
      );


      return () => {

        document.removeEventListener(
          "click",
          handleClick
        );

      };

    },
    []
  );


  /* ======================================================= */
  /* BODY LOCK + ESCAPE + AUTOFOCUS */
  /* ======================================================= */

  useEffect(
    () => {

      if (
        !open
      ) {

        document.body.style.overflow =
          "";

        return;

      }


      document.body.style.overflow =
        "hidden";


      const timer =
        window.setTimeout(
          () => {

            inputRef.current?.focus();

          },
          100
        );


      const handleKeyboard =
        (
          event:
            KeyboardEvent
        ) => {

          if (
            event.key ===
            "Escape"
          ) {

            setOpen(
              false
            );

            setQuery(
              ""
            );

          }

        };


      window.addEventListener(
        "keydown",
        handleKeyboard
      );


      return () => {

        window.clearTimeout(
          timer
        );

        window.removeEventListener(
          "keydown",
          handleKeyboard
        );

        document.body.style.overflow =
          "";

      };

    },
    [open]
  );


  /* ======================================================= */
  /* IMAGE URL */
  /* ======================================================= */

  const imageUrl =
    (
      url:
        | string
        | null
    ) => {

      if (
        !url
      ) {

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


  /* ======================================================= */
  /* PRICE */
  /* ======================================================= */

  const formatPrice =
    (
      price:
        number
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
  /* CLOSE */
  /* ======================================================= */

  const closeSearch =
    () => {

      setOpen(
        false
      );

      setQuery(
        ""
      );

    };


  /* ======================================================= */
  /* SEARCH RESULTS */
  /* ======================================================= */

  const normalizedQuery =
    normalizeText(
      query
    );


  const results =
    useMemo(
      () => {

        if (
          !normalizedQuery
        ) {

          return [];

        }


        return products
          .filter(
            product => {

              const searchableText =
                [
                  product.name,
                  product.sku,
                  product.category,
                  product.material,
                  product.dimensions,
                  product.description,
                  ...product.colors,
                ]
                  .map(
                    value =>
                      normalizeText(
                        value ||
                          ""
                      )
                  )
                  .join(
                    " "
                  );


              return searchableText.includes(
                normalizedQuery
              );

            }
          )
          .slice(
            0,
            20
          );

      },
      [
        products,
        normalizedQuery,
      ]
    );


  /* ======================================================= */
  /* SUGGESTIONS */
  /* ======================================================= */

  const suggestions =
    useMemo(
      () => {

        return products
          .filter(
            product =>
              product.stock >
              0
          )
          .slice(
            0,
            4
          );

      },
      [
        products,
      ]
    );


  /* ======================================================= */
  /* PRODUCT PAGE SEARCH BUTTON */
  /* ======================================================= */

  const productPageSearchButton =
    productHeaderTarget
      ? createPortal(

          <button
            type="button"
            className="elio-product-search-button"
            data-elio-search-trigger
          >
            Recherche
          </button>,

          productHeaderTarget
        )
      : null;


  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (

    <>

      {
        productPageSearchButton
      }


      {
        open && (

          <div
            className="elio-global-search-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Recherche ELIO"
          >

            {/* BACKDROP */}

            <button
              type="button"
              className="elio-global-search-backdrop"
              aria-label="Fermer la recherche"
              onClick={
                closeSearch
              }
            ></button>


            {/* PANEL */}

            <section className="elio-global-search-panel">


              {/* =========================================== */}
              {/* HEADER */}
              {/* =========================================== */}

              <header className="elio-global-search-header">

                <div>

                  <p>
                    RECHERCHE
                  </p>

                  <h2>
                    Trouver une pièce.
                  </h2>

                </div>


                <button
                  type="button"
                  className="elio-global-search-close"
                  onClick={
                    closeSearch
                  }
                  aria-label="Fermer"
                >
                  ×
                </button>

              </header>


              {/* =========================================== */}
              {/* INPUT */}
              {/* =========================================== */}

              <div className="elio-global-search-field">

                <span className="elio-search-icon">
                  ⌕
                </span>


                <input
                  ref={
                    inputRef
                  }
                  type="search"
                  value={
                    query
                  }
                  onChange={
                    event =>
                      setQuery(
                        event.target.value
                      )
                  }
                  placeholder="Sac, couleur, matière, référence..."
                  autoComplete="off"
                />


                {
                  query && (

                    <button
                      type="button"
                      onClick={() =>
                        setQuery(
                          ""
                        )
                      }
                    >
                      Effacer
                    </button>

                  )
                }

              </div>


              {/* =========================================== */}
              {/* CONTENT */}
              {/* =========================================== */}

              <div className="elio-global-search-content">


                {/* LOADING */}

                {
                  loading && (

                    <div className="elio-search-loading">

                      <div className="elio-search-loader"></div>

                      <span>
                        Chargement de la collection...
                      </span>

                    </div>

                  )
                }


                {/* ERROR */}

                {
                  !loading &&
                  error && (

                    <div className="elio-search-error">

                      <span>
                        ELIO
                      </span>

                      <h3>
                        Recherche indisponible.
                      </h3>

                      <p>
                        {error}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          void loadProducts()
                        }
                      >
                        Réessayer
                      </button>

                    </div>

                  )
                }


                {/* NO QUERY */}

                {
                  !loading &&
                  !error &&
                  !normalizedQuery && (

                    <>

                      <div className="elio-search-intro">

                        <span>
                          DÉCOUVRIR
                        </span>

                        <p>
                          Recherchez un produit par son nom,
                          sa catégorie, sa couleur, sa matière
                          ou sa référence.
                        </p>

                      </div>


                      {/* QUICK LINKS */}

                      <div className="elio-search-shortcuts">

                        <a
                          href="/nouveautes"
                          onClick={
                            closeSearch
                          }
                        >
                          Nouveautés
                          <span>
                            →
                          </span>
                        </a>


                        <a
                          href="/collection/sacs"
                          onClick={
                            closeSearch
                          }
                        >
                          Sacs
                          <span>
                            →
                          </span>
                        </a>


                        <a
                          href="/collection"
                          onClick={
                            closeSearch
                          }
                        >
                          Toute la collection
                          <span>
                            →
                          </span>
                        </a>

                      </div>


                      {/* SUGGESTIONS */}

                      {
                        suggestions.length >
                        0 && (

                          <div className="elio-search-suggestions-section">

                            <div className="elio-search-section-heading">

                              <span>
                                SÉLECTION ELIO
                              </span>

                              <small>
                                {products.length} produit
                                {products.length !== 1
                                  ? "s"
                                  : ""}
                              </small>

                            </div>


                            <div className="elio-search-suggestions">

                              {
                                suggestions.map(
                                  product => (

                                    <a
                                      className="elio-search-suggestion"
                                      href={`/produit/${product.slug}`}
                                      key={
                                        product.id
                                      }
                                    >

                                      <div className="elio-search-suggestion-image">

                                        {
                                          product.main_image
                                            ? (

                                                <img
                                                  src={
                                                    imageUrl(
                                                      product.main_image
                                                    )
                                                  }
                                                  alt={
                                                    product.name
                                                  }
                                                />

                                              )
                                            : (

                                                <span>
                                                  ELIO
                                                </span>

                                              )
                                        }


                                        {
                                          product.is_new && (

                                            <small>
                                              Nouveau
                                            </small>

                                          )
                                        }

                                      </div>


                                      <div className="elio-search-suggestion-info">

                                        <span>
                                          {product.category}
                                        </span>

                                        <strong>
                                          {product.name}
                                        </strong>

                                        <b>
                                          {formatPrice(
                                            product.price
                                          )}{" "}
                                          TND
                                        </b>

                                      </div>

                                    </a>

                                  )
                                )
                              }

                            </div>

                          </div>

                        )
                      }

                    </>

                  )
                }


                {/* RESULTS */}

                {
                  !loading &&
                  !error &&
                  normalizedQuery &&
                  results.length >
                  0 && (

                    <>

                      <div className="elio-search-result-heading">

                        <span>
                          {results.length} résultat
                          {results.length !== 1
                            ? "s"
                            : ""}
                        </span>

                        <small>
                          pour “{query}”
                        </small>

                      </div>


                      <div className="elio-search-results">

                        {
                          results.map(
                            product => (

                              <a
                                href={`/produit/${product.slug}`}
                                className="elio-search-result"
                                key={
                                  product.id
                                }
                              >

                                {/* IMAGE */}

                                <div className="elio-search-result-image">

                                  {
                                    product.main_image
                                      ? (

                                          <img
                                            src={
                                              imageUrl(
                                                product.main_image
                                              )
                                            }
                                            alt={
                                              product.name
                                            }
                                          />

                                        )
                                      : (

                                          <span>
                                            ELIO
                                          </span>

                                        )
                                  }


                                  {
                                    product.is_new && (

                                      <small>
                                        Nouveau
                                      </small>

                                    )
                                  }

                                </div>


                                {/* INFORMATION */}

                                <div className="elio-search-result-info">

                                  <span className="elio-search-category">
                                    {product.category}
                                  </span>

                                  <h3>
                                    {product.name}
                                  </h3>


                                  {
                                    product.colors.length >
                                    0 && (

                                      <p>
                                        {product.colors
                                          .slice(
                                            0,
                                            5
                                          )
                                          .join(
                                            " · "
                                          )}
                                      </p>

                                    )
                                  }


                                  {
                                    product.material && (

                                      <small>
                                        {product.material}
                                      </small>

                                    )
                                  }


                                  <div className="elio-search-price">

                                    {
                                      product.compare_at_price &&
                                      product.compare_at_price >
                                        product.price && (

                                        <del>
                                          {formatPrice(
                                            product.compare_at_price
                                          )}{" "}
                                          TND
                                        </del>

                                      )
                                    }


                                    <strong>
                                      {formatPrice(
                                        product.price
                                      )}{" "}
                                      TND
                                    </strong>

                                  </div>


                                  {
                                    product.stock >
                                    0
                                      ? (

                                          <span className="elio-search-stock">
                                            En stock
                                          </span>

                                        )
                                      : (

                                          <span className="elio-search-out-stock">
                                            Rupture de stock
                                          </span>

                                        )
                                  }

                                </div>


                                <span className="elio-search-result-arrow">
                                  →
                                </span>

                              </a>

                            )
                          )
                        }

                      </div>

                    </>

                  )
                }


                {/* EMPTY RESULTS */}

                {
                  !loading &&
                  !error &&
                  normalizedQuery &&
                  results.length ===
                  0 && (

                    <div className="elio-search-empty">

                      <span className="elio-search-empty-logo">
                        ELIO
                      </span>

                      <h3>
                        Aucun résultat.
                      </h3>

                      <p>
                        Aucun produit ne correspond à{" "}
                        <strong>
                          “{query}”
                        </strong>.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setQuery(
                            ""
                          )
                        }
                      >
                        Nouvelle recherche
                      </button>

                    </div>

                  )
                }

              </div>


              {/* =========================================== */}
              {/* FOOTER */}
              {/* =========================================== */}

              <footer className="elio-global-search-footer">

                <span>
                  {products.length} produit
                  {products.length !== 1
                    ? "s"
                    : ""}{" "}
                  dans la boutique
                </span>

                <small>
                  Échap pour fermer
                </small>

              </footer>

            </section>

          </div>

        )
      }

    </>

  );

}


export default GlobalSearch;
