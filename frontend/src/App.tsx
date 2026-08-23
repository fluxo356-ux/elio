import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import "./App.css";
import "./Checkout.css";

import { useCart } from "./store/CartContext";


const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000");
const DELIVERY_FEE = 8;


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


type CartDisplayItem = {
  product: Product;
  color: string;
  quantity: number;
};


type CheckoutForm = {
  customer_name: string;
  phone: string;
  email: string;
  governorate: string;
  city: string;
  address: string;
  notes: string;
};


type OrderResult = {
  success: boolean;
  order_id: number;
  order_number: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
};


const emptyCheckoutForm: CheckoutForm = {
  customer_name: "",
  phone: "",
  email: "",
  governorate: "",
  city: "",
  address: "",
  notes: "",
};


const governorates = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "La Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
];


/* ========================================================= */
/* APP */
/* ========================================================= */

function App() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [cartOpen, setCartOpen] =
    useState(false);

  const [checkoutOpen, setCheckoutOpen] =
    useState(false);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [productsLoading, setProductsLoading] =
    useState(true);

  const [productsError, setProductsError] =
    useState("");

  const [selectedColors, setSelectedColors] =
    useState<Record<number, string>>({});

  const [checkoutForm, setCheckoutForm] =
    useState<CheckoutForm>(
      emptyCheckoutForm
    );

  const [orderSubmitting, setOrderSubmitting] =
    useState(false);

  const [orderError, setOrderError] =
    useState("");

  const [orderResult, setOrderResult] =
    useState<OrderResult | null>(null);

  const [newsletterEmail, setNewsletterEmail] =
    useState("");

  const [newsletterSubmitting, setNewsletterSubmitting] =
    useState(false);

  const [newsletterMessage, setNewsletterMessage] =
    useState("");

  const [newsletterStatus, setNewsletterStatus] =
    useState<"idle" | "success" | "error">("idle");


  /* ======================================================= */
  /* SHARED CART */
  /* ======================================================= */

  const {
    cart,
    cartCount,
    addItem,
    changeItemQuantity,
    removeItem,
    reconcileCart,
    clearCart,
  } = useCart();


  /* ======================================================= */
  /* LOAD PRODUCTS */
  /* ======================================================= */

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      setProductsError("");

      const response =
        await fetch(
          `${API_URL}/api/products`
        );

      if (!response.ok) {
        throw new Error(
          "Impossible de charger les produits."
        );
      }

      const data: Product[] =
        await response.json();

      setProducts(data);

      reconcileCart(
        data.map(
          product => ({
            id: product.id,
            stock: product.stock,
            colors: product.colors,
          })
        )
      );

      setSelectedColors(
        previous => {
          const next = {
            ...previous,
          };

          data.forEach(
            product => {
              const current =
                next[product.id];

              if (
                !current ||
                !product.colors.includes(
                  current
                )
              ) {
                next[product.id] =
                  product.colors[0] || "";
              }
            }
          );

          return next;
        }
      );
    } catch {
      setProductsError(
        "Impossible de contacter la boutique ELIO."
      );
    } finally {
      setProductsLoading(false);
    }
  };


  useEffect(() => {
    loadProducts();
  }, []);


  /* ======================================================= */
  /* OPEN CART FROM PRODUCT PAGE LINK */
  /* ======================================================= */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get("openCart") === "1"
    ) {
      setCartOpen(true);

      params.delete(
        "openCart"
      );

      const query =
        params.toString();

      const cleanUrl =
        `${window.location.pathname}` +
        `${query ? `?${query}` : ""}` +
        `${window.location.hash}`;

      window.history.replaceState(
        {},
        "",
        cleanUrl
      );
    }
  }, []);


  /* ======================================================= */
  /* LOCK BODY */
  /* ======================================================= */

  useEffect(() => {
    if (
      cartOpen ||
      checkoutOpen
    ) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [
    cartOpen,
    checkoutOpen,
  ]);


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
      url.startsWith("http")
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }
    ).format(price);
  };


  const closeMenu = () => {
    setMenuOpen(false);
  };


  /* ======================================================= */
  /* CART DISPLAY ITEMS */
  /* ======================================================= */

  const cartItems:
    CartDisplayItem[] =
    useMemo(() => {
      return cart
        .map(item => {
          const product =
            products.find(
              product =>
                product.id ===
                item.product_id
            );

          if (!product) {
            return null;
          }

          return {
            product,
            color: item.color,
            quantity: item.quantity,
          };
        })
        .filter(
          (
            item
          ): item is CartDisplayItem =>
            item !== null
        );
    }, [
      cart,
      products,
    ]);


  /* ======================================================= */
  /* CART TOTALS */
  /* ======================================================= */

  const cartSubtotal =
    useMemo(() => {
      return cartItems.reduce(
        (
          total,
          item
        ) =>
          total +
          item.product.price *
          item.quantity,
        0
      );
    }, [cartItems]);


  const cartTotal =
    cartItems.length > 0
      ? cartSubtotal +
        DELIVERY_FEE
      : 0;


  /* ======================================================= */
  /* ADD TO CART */
  /* ======================================================= */

  const addToCart = (
    product: Product
  ) => {
    if (
      product.stock <= 0
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

    setCartOpen(true);
  };


  /* ======================================================= */
  /* QUANTITY */
  /* ======================================================= */

  const changeQuantity = (
    productId: number,
    color: string,
    change: number
  ) => {
    const product =
      products.find(
        product =>
          product.id ===
          productId
      );

    if (!product) {
      return;
    }

    changeItemQuantity(
      productId,
      color,
      change,
      product.stock
    );
  };


  /* ======================================================= */
  /* REMOVE ITEM */
  /* ======================================================= */

  const removeCartItem = (
    productId: number,
    color: string
  ) => {
    removeItem(
      productId,
      color
    );
  };


  /* ======================================================= */
  /* PRODUCT GRID */
  /* ======================================================= */

  const productGridClass =
    () => {
      if (
        products.length === 1
      ) {
        return "products products-one";
      }

      if (
        products.length === 2
      ) {
        return "products products-two";
      }

      return "products";
    };


  /* ======================================================= */
  /* OPEN CHECKOUT */
  /* ======================================================= */

  const openCheckout = () => {
    if (
      cartItems.length === 0
    ) {
      return;
    }

    setOrderError("");
    setOrderResult(null);

    setCartOpen(false);
    setCheckoutOpen(true);
  };


  /* ======================================================= */
  /* CHECKOUT INPUT */
  /* ======================================================= */

  const updateCheckoutField = (
    field: keyof CheckoutForm,
    value: string
  ) => {
    setCheckoutForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  };


  /* ======================================================= */
  /* SUBMIT ORDER */
  /* ======================================================= */

  const submitOrder =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (
        cartItems.length === 0
      ) {
        setOrderError(
          "Votre panier est vide."
        );

        return;
      }

      setOrderSubmitting(true);
      setOrderError("");

      try {
        const payload = {
          customer_name:
            checkoutForm
              .customer_name
              .trim(),

          phone:
            checkoutForm
              .phone
              .trim(),

          email:
            checkoutForm
              .email
              .trim() ||
            null,

          governorate:
            checkoutForm
              .governorate,

          city:
            checkoutForm
              .city
              .trim(),

          address:
            checkoutForm
              .address
              .trim(),

          notes:
            checkoutForm
              .notes
              .trim(),

          items:
            cartItems.map(
              item => ({
                product_id:
                  item.product.id,

                color:
                  item.color,

                quantity:
                  item.quantity,
              })
            ),
        };


        const response =
          await fetch(
            `${API_URL}/api/orders`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {
          let message =
            "Impossible d'enregistrer votre commande.";

          if (
            typeof data.detail ===
            "string"
          ) {
            message =
              data.detail;
          }

          throw new Error(
            message
          );
        }


        const result =
          data as OrderResult;


        setOrderResult(
          result
        );


        clearCart();


        await loadProducts();

      } catch (error) {
        setOrderError(
          error instanceof Error
            ? error.message
            : "Une erreur est survenue."
        );
      } finally {
        setOrderSubmitting(false);
      }
    };


  /* ======================================================= */
  /* CLOSE CHECKOUT */
  /* ======================================================= */

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setOrderError("");

    if (
      orderResult
    ) {
      setOrderResult(null);

      setCheckoutForm(
        emptyCheckoutForm
      );
    }
  };


  /* ======================================================= */
  /* NEWSLETTER */
  /* ======================================================= */

  const submitNewsletter =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const email =
        newsletterEmail
          .trim()
          .toLowerCase();

      if (!email) {
        setNewsletterStatus("error");

        setNewsletterMessage(
          "Veuillez saisir votre adresse e-mail."
        );

        return;
      }

      setNewsletterSubmitting(true);
      setNewsletterStatus("idle");
      setNewsletterMessage("");

      try {
        const response =
          await fetch(
            `${API_URL}/api/newsletter/subscribe`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  email,
                }),
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          const message =
            data &&
            typeof data.detail === "string"
              ? data.detail
              : "Impossible de vous inscrire à la newsletter.";

          throw new Error(
            message
          );
        }

        setNewsletterStatus("success");

        setNewsletterMessage(
          data &&
          typeof data.message === "string"
            ? data.message
            : "Merci. Votre inscription à la newsletter ELIO est confirmée."
        );

        setNewsletterEmail("");
      } catch (error) {
        setNewsletterStatus("error");

        setNewsletterMessage(
          error instanceof Error
            ? error.message
            : "Impossible de vous inscrire à la newsletter."
        );
      } finally {
        setNewsletterSubmitting(false);
      }
    };


  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <div className="app">

      {/* ANNOUNCEMENT */}

      <div className="announcement">
        Livraison partout en Tunisie
      </div>


      {/* HEADER */}

      <header className="header">

        <button
          className={`mobile-menu-button ${
            menuOpen
              ? "menu-active"
              : ""
          }`}
          onClick={() =>
            setMenuOpen(
              !menuOpen
            )
          }
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>


        <nav className="nav nav-left">
          <a href="/nouveautes">
            Nouveautés
          </a>

          <a href="/collection/sacs">
            Sacs
          </a>

          <a href="/collection">
            Collection
          </a>
        </nav>


        <a
          href="/"
          className="logo"
        >
          <img
            src="/elio-logo-transparent.png"
            alt="ELIO Maroquinerie"
          />
        </a>


        <nav className="nav nav-right">
          <a href="/#maison">
            Maison ELIO
          </a>

          <button
            type="button"
            className="nav-button"
            data-elio-search-trigger
          >
            Recherche
          </button>

          <button
            className="nav-button cart-nav"
            onClick={() =>
              setCartOpen(true)
            }
          >
            Panier

            <span className="cart-count">
              {cartCount}
            </span>
          </button>
        </nav>


        <button
          className="mobile-cart"
          onClick={() =>
            setCartOpen(true)
          }
        >
          Panier

          <span className="cart-count">
            {cartCount}
          </span>
        </button>


        <div
          className={`mobile-menu ${
            menuOpen
              ? "mobile-menu-open"
              : ""
          }`}
        >
          <nav className="mobile-menu-links">

            <a
              href="/nouveautes"
              onClick={closeMenu}
            >
              Nouveautés
              <span>→</span>
            </a>

            <a
              href="/collection/sacs"
              onClick={closeMenu}
            >
              Sacs
              <span>→</span>
            </a>

            <a
              href="/collection"
              onClick={closeMenu}
            >
              Collection
              <span>→</span>
            </a>

            <a
              href="/#maison"
              onClick={closeMenu}
            >
              Maison ELIO
              <span>→</span>
            </a>

          </nav>


          <div className="mobile-menu-footer">

            <button
              type="button"
              data-elio-search-trigger
            >
              Recherche
            </button>

            <a
              href="/contact"
              onClick={closeMenu}
            >
              Contact
            </a>

          </div>
        </div>

      </header>


      {/* MAIN */}

      <main id="top">

        {/* HERO */}

        <section className="hero">

          <div className="hero-background"></div>

          <div className="hero-overlay"></div>


          <div className="hero-content">

            <p className="eyebrow">
              ELIO MAROQUINERIE · DEPUIS 2026
            </p>

            <h1>
              L'élégance
              <br />
              dans chaque
              <br />
              détail.
            </h1>

            <p className="hero-description">
              Découvrez une maroquinerie pensée pour
              accompagner chaque instant avec élégance,
              caractère et simplicité.
            </p>

            <a
              href="/collection"
              className="hero-button"
            >
              Découvrir la collection
            </a>

          </div>


          <div className="hero-scroll">
            <span>
              Découvrir
            </span>

            <div></div>
          </div>

        </section>


        {/* SERVICES */}

        <section className="services">

          <div className="service">
            <span className="service-number">
              01
            </span>

            <div>
              <strong>
                Livraison en Tunisie
              </strong>

              <span>
                Tarif unique · 8 TND
              </span>
            </div>
          </div>


          <div className="service">
            <span className="service-number">
              02
            </span>

            <div>
              <strong>
                Paiement à la livraison
              </strong>

              <span>
                Simple et sécurisé
              </span>
            </div>
          </div>


          <div className="service">
            <span className="service-number">
              03
            </span>

            <div>
              <strong>
                Service client
              </strong>

              <span>
                À votre écoute
              </span>
            </div>
          </div>

        </section>


        {/* INTRO */}

        <section
          className="introduction"
          id="nouveautes"
        >

          <div className="section-heading">

            <p className="section-label">
              LA MAISON ELIO
            </p>

            <h2>
              Des pièces qui
              <br />
              vous accompagnent.
            </h2>

            <p className="section-description">
              Sacs et accessoires imaginés autour
              d'une esthétique élégante, moderne
              et intemporelle.
            </p>

          </div>


          <div className="categories">

            <article className="category-card">

              <div className="category-image category-image-one">

                <div className="image-placeholder">
                  <span>
                    PHOTO COLLECTION
                  </span>
                </div>

              </div>


              <div className="category-info">

                <p>
                  LA COLLECTION
                </p>

                <h3>
                  Sacs à main
                </h3>

                <a href="/collection/sacs-a-main">
                  Découvrir
                  <span>→</span>
                </a>

              </div>

            </article>


            <article className="category-card category-card-second">

              <div className="category-image category-image-two">

                <div className="image-placeholder">
                  <span>
                    PHOTO COLLECTION
                  </span>
                </div>

              </div>


              <div className="category-info">

                <p>
                  LES ESSENTIELS
                </p>

                <h3>
                  Petite maroquinerie
                </h3>

                <a href="/collection/petite-maroquinerie">
                  Découvrir
                  <span>→</span>
                </a>

              </div>

            </article>

          </div>

        </section>


        {/* COLLECTION */}

        <section
          className="collection"
          id="collection"
        >

          <div className="collection-header">

            <div>
              <p className="section-label">
                COLLECTION 2026
              </p>

              <h2>
                Les essentiels ELIO
              </h2>
            </div>

            <a
              href="/collection"
              className="view-all"
            >
              Voir toute la collection
              <span>→</span>
            </a>

          </div>


          <div id="sacs">

            {productsLoading && (
              <div className="store-state">
                <div className="loader"></div>

                <p>
                  Chargement de la collection...
                </p>
              </div>
            )}


            {!productsLoading &&
              productsError && (
                <div className="store-state">

                  <strong>
                    Collection indisponible
                  </strong>

                  <p>
                    {productsError}
                  </p>

                </div>
              )}


            {!productsLoading &&
              !productsError &&
              products.length === 0 && (
                <div className="store-state">

                  <strong>
                    La collection arrive bientôt.
                  </strong>

                  <p>
                    Découvrez prochainement
                    les créations ELIO.
                  </p>

                </div>
              )}


            {!productsLoading &&
              !productsError &&
              products.length > 0 && (

                <div
                  className={
                    productGridClass()
                  }
                >

                  {products.map(
                    product => (

                      <article
                        className="product"
                        key={
                          product.id
                        }
                      >

                        <a
                          href={`/produit/${product.slug}`}
                          className="product-image"
                          aria-label={`Voir ${product.name}`}
                        >

                          {product.main_image ? (
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
                            <div className="product-no-image">
                              <span>
                                ELIO
                              </span>

                              <small>
                                Photo à venir
                              </small>
                            </div>
                          )}


                          {product.is_new ? (
                            <span className="product-badge">
                              Nouveau
                            </span>
                          ) : product.is_featured ? (
                            <span className="product-badge">
                              Signature
                            </span>
                          ) : null}


                          {product.stock <= 0 && (
                            <span className="sold-out-badge">
                              Rupture
                            </span>
                          )}

                        </a>


                        <div className="product-content">

                          <p className="product-category">
                            {
                              product.category
                            }
                          </p>


                          <div className="product-top">

                            <h3>
                              <a
                                href={`/produit/${product.slug}`}
                              >
                                {
                                  product.name
                                }
                              </a>
                            </h3>


                            <div className="price-block">

                              {product.compare_at_price &&
                                product.compare_at_price >
                                  product.price && (
                                  <span className="old-price">
                                    {formatPrice(
                                      product.compare_at_price
                                    )}{" "}
                                    TND
                                  </span>
                                )}


                              <span className="product-price">
                                {formatPrice(
                                  product.price
                                )}{" "}
                                TND
                              </span>

                            </div>

                          </div>


                          {product.colors.length > 0 && (

                            <div className="product-color-area">

                              <span className="color-label">
                                Couleur :{" "}
                                <strong>
                                  {selectedColors[
                                    product.id
                                  ] ||
                                    product.colors[
                                      0
                                    ]}
                                </strong>
                              </span>


                              <div className="store-colors">

                                {product.colors.map(
                                  color => (

                                    <button
                                      type="button"
                                      key={
                                        color
                                      }
                                      className={
                                        (
                                          selectedColors[
                                            product.id
                                          ] ||
                                          product.colors[
                                            0
                                          ]
                                        ) ===
                                        color
                                          ? "color-option color-option-active"
                                          : "color-option"
                                      }
                                      onClick={() =>
                                        setSelectedColors(
                                          previous => ({
                                            ...previous,
                                            [product.id]:
                                              color,
                                          })
                                        )
                                      }
                                    >
                                      {color}
                                    </button>

                                  )
                                )}

                              </div>

                            </div>

                          )}


                          <div className="stock-line">

                            {product.stock > 0 ? (
                              <span className="in-stock">
                                En stock
                              </span>
                            ) : (
                              <span className="out-stock">
                                Rupture de stock
                              </span>
                            )}

                          </div>


                          <button
                            className="add-to-cart-button"
                            disabled={
                              product.stock <= 0
                            }
                            onClick={() =>
                              addToCart(
                                product
                              )
                            }
                          >
                            {product.stock > 0
                              ? "Ajouter au panier"
                              : "Indisponible"}
                          </button>

                        </div>

                      </article>

                    )
                  )}

                </div>

              )}

          </div>

        </section>


        {/* MAISON */}

        <section
          className="maison"
          id="maison"
        >

          <div className="maison-image">
            <span>
              PHOTO ELIO
            </span>
          </div>


          <div className="maison-content">

            <p className="section-label">
              MAISON ELIO
            </p>

            <h2>
              Une allure simple.
              <br />
              Une présence forte.
            </h2>

            <p>
              ELIO est née avec une vision simple :
              proposer une maroquinerie élégante,
              contemporaine et pensée pour accompagner
              le quotidien.
            </p>

            <p>
              Notre univers associe lignes épurées,
              caractère et sophistication discrète.
            </p>

            <a href="/collection">
              Découvrir notre univers
              <span>→</span>
            </a>

          </div>

        </section>


        {/* SOCIAL / INSTAGRAM */}

        <section className="social-invite">

          <a
            className="social-invite-link"
            href="https://www.instagram.com/elio.maroquinerie/"
            target="_blank"
            rel="noreferrer"
          >

            <span className="social-invite-kicker">
              Rejoignez-nous sur Instagram
            </span>

            <strong>
              @elio.maroquinerie
            </strong>

            <span className="social-invite-arrow">
              ↗
            </span>

          </a>

        </section>

      </main>


      {/* FOOTER */}

      <footer
        id="contact"
        className="site-footer"
      >

        <div className="footer-main">

          <div className="footer-column footer-about">

            <h4>
              ELIO
            </h4>

            <p className="footer-about-text">
              ELIO Maroquinerie imagine une maroquinerie
              contemporaine où élégance, simplicité et
              caractère se rencontrent.
            </p>

            <p className="footer-location">
              Tunisie · Depuis 2026
              <br />
              Designed in Tunisia
            </p>

            <div className="footer-contact-list">

              <a href="tel:+21626570229">
                +216 26 570 229
              </a>

              <a
                href="https://wa.me/21626570229"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>

              <a href="mailto:Elio.maroquinerie@gmail.com">
                Elio.maroquinerie@gmail.com
              </a>

            </div>

          </div>


          <div className="footer-column">

            <h4>
              Services
            </h4>

            <a href="/faq">
              Livraison · 8 TND
            </a>

            <a href="/faq">
              Livraison estimée · 48 h
            </a>

            <a href="/faq">
              Paiement à la livraison
            </a>

            <a href="/retours">
              Retours & échanges
            </a>

          </div>


          <div className="footer-column">

            <h4>
              Informations
            </h4>

            <a href="/contact">
              Contact
            </a>

            <a href="/faq">
              F.A.Q
            </a>

            <a href="/confidentialite">
              Politique de confidentialité
            </a>

            <a href="/conditions-generales">
              Conditions générales
            </a>

          </div>


          <div className="footer-column">

            <h4>
              Boutique
            </h4>

            <a href="/nouveautes">
              Nouveautés
            </a>

            <a href="/collection/sacs">
              Sacs
            </a>

            <a href="/collection">
              Collection
            </a>

            <a href="/#maison">
              Maison ELIO
            </a>

          </div>


          <div className="footer-column footer-newsletter">

            <h4>
              Newsletter
            </h4>

            <p>
              Recevez les nouveautés ELIO,
              les collections et nos offres privées.
            </p>

            <form
              className="footer-newsletter-form"
              onSubmit={
                submitNewsletter
              }
            >

              <label
                className="sr-only"
                htmlFor="footer-newsletter-email"
              >
                Votre adresse e-mail
              </label>

              <div className="footer-newsletter-field">

                <input
                  id="footer-newsletter-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={
                    newsletterEmail
                  }
                  onChange={
                    event => {
                      setNewsletterEmail(
                        event.target.value
                      );

                      if (
                        newsletterStatus !== "idle"
                      ) {
                        setNewsletterStatus(
                          "idle"
                        );

                        setNewsletterMessage(
                          ""
                        );
                      }
                    }
                  }
                  placeholder="Votre adresse e-mail"
                  disabled={
                    newsletterSubmitting
                  }
                />

                <button
                  type="submit"
                  aria-label="S'inscrire à la newsletter ELIO"
                  disabled={
                    newsletterSubmitting
                  }
                >
                  {newsletterSubmitting
                    ? "…"
                    : "→"}
                </button>

              </div>

            </form>

            <small
              className={
                newsletterStatus === "success"
                  ? "footer-newsletter-message footer-newsletter-message-success"
                  : newsletterStatus === "error"
                    ? "footer-newsletter-message footer-newsletter-message-error"
                    : "footer-newsletter-message"
              }
              role={
                newsletterStatus === "error"
                  ? "alert"
                  : undefined
              }
              aria-live="polite"
            >
              {newsletterMessage ||
                "Nous ne partageons jamais votre adresse e-mail avec des tiers."}
            </small>

          </div>

        </div>


        <div className="footer-social-row">

          <span>
            Suivez ELIO
          </span>

          <div>

            <a
              href="https://www.instagram.com/elio.maroquinerie/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>

            <a
              href="https://www.tiktok.com/@elio.maroquinerie"
              target="_blank"
              rel="noreferrer"
            >
              TikTok
            </a>

            <a
              href="https://wa.me/21626570229"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>

          </div>

        </div>


        <div className="footer-bottom">

          <p>
            © 2026 ELIO Maroquinerie.
            Tous droits réservés.
          </p>

          <div className="footer-bottom-right">

            <span>
              Designed in Tunisia
            </span>

            <span>
              Livraison Tunisie · 8 TND
            </span>

            <span>
              Paiement à la livraison
            </span>

          </div>

        </div>

      </footer>


      {/* CART OVERLAY */}

      <div
        className={`cart-overlay ${
          cartOpen
            ? "cart-overlay-open"
            : ""
        }`}
        onClick={() =>
          setCartOpen(false)
        }
      ></div>


      {/* CART DRAWER */}

      <aside
        className={`cart-drawer ${
          cartOpen
            ? "cart-drawer-open"
            : ""
        }`}
      >

        <div className="cart-drawer-header">

          <div>
            <p>
              VOTRE SÉLECTION
            </p>

            <h2>
              Panier
            </h2>
          </div>


          <button
            className="cart-close"
            onClick={() =>
              setCartOpen(false)
            }
          >
            ×
          </button>

        </div>


        <div className="cart-drawer-body">

          {cartItems.length === 0 ? (

            <div className="cart-empty">

              <span className="cart-empty-logo">
                ELIO
              </span>

              <h3>
                Votre panier est vide.
              </h3>

              <p>
                Découvrez notre collection
                et ajoutez vos pièces préférées.
              </p>

              <button
                onClick={() =>
                  setCartOpen(false)
                }
              >
                Continuer mes achats
              </button>

            </div>

          ) : (

            <div className="cart-items">

              {cartItems.map(
                item => (

                  <article
                    className="cart-item"
                    key={`${item.product.id}-${item.color}`}
                  >

                    <div className="cart-item-image">

                      {item.product.main_image ? (
                        <img
                          src={
                            imageUrl(
                              item.product.main_image
                            )
                          }
                          alt={
                            item.product.name
                          }
                        />
                      ) : (
                        <span>
                          ELIO
                        </span>
                      )}

                    </div>


                    <div className="cart-item-details">

                      <div className="cart-item-top">

                        <div>
                          <span className="cart-item-category">
                            {
                              item.product.category
                            }
                          </span>

                          <h3>
                            {
                              item.product.name
                            }
                          </h3>

                          {item.color && (
                            <p>
                              Couleur :{" "}
                              <strong>
                                {
                                  item.color
                                }
                              </strong>
                            </p>
                          )}
                        </div>


                        <button
                          className="cart-remove"
                          onClick={() =>
                            removeCartItem(
                              item.product.id,
                              item.color
                            )
                          }
                        >
                          ×
                        </button>

                      </div>


                      <div className="cart-item-bottom">

                        <div className="quantity-selector">

                          <button
                            onClick={() =>
                              changeQuantity(
                                item.product.id,
                                item.color,
                                -1
                              )
                            }
                          >
                            −
                          </button>

                          <span>
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            disabled={
                              item.quantity >=
                              item.product.stock
                            }
                            onClick={() =>
                              changeQuantity(
                                item.product.id,
                                item.color,
                                1
                              )
                            }
                          >
                            +
                          </button>

                        </div>


                        <strong className="cart-line-price">
                          {formatPrice(
                            item.product.price *
                              item.quantity
                          )}{" "}
                          TND
                        </strong>

                      </div>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </div>


        {cartItems.length > 0 && (

          <div className="cart-drawer-footer">

            <div className="cart-subtotal">

              <span>
                Sous-total
              </span>

              <strong>
                {formatPrice(
                  cartSubtotal
                )}{" "}
                TND
              </strong>

            </div>


            <p className="cart-delivery-info">
              Livraison partout en Tunisie :{" "}
              <strong>
                {formatPrice(
                  DELIVERY_FEE
                )}{" "}
                TND
              </strong>
              . Total avec livraison :{" "}
              <strong>
                {formatPrice(
                  cartTotal
                )}{" "}
                TND
              </strong>
              .
            </p>


            <button
              className="checkout-button"
              onClick={
                openCheckout
              }
            >
              Passer la commande
              <span>→</span>
            </button>


            <button
              className="continue-shopping"
              onClick={() =>
                setCartOpen(false)
              }
            >
              Continuer mes achats
            </button>

          </div>

        )}

      </aside>


      {/* =================================================== */}
      {/* CHECKOUT OVERLAY */}
      {/* =================================================== */}

      <div
        className={`checkout-overlay ${
          checkoutOpen
            ? "checkout-overlay-open"
            : ""
        }`}
      >

        <div className="checkout-panel">

          {orderResult ? (

            <div className="order-success">

              <button
                className="checkout-close"
                onClick={
                  closeCheckout
                }
              >
                ×
              </button>


              <div className="success-mark">
                ✓
              </div>


              <p className="checkout-eyebrow">
                COMMANDE CONFIRMÉE
              </p>


              <h2>
                Merci pour
                <br />
                votre commande.
              </h2>


              <p className="success-text">
                Votre commande ELIO a bien été
                enregistrée. Notre équipe pourra
                vous contacter afin de confirmer
                la livraison.
              </p>


              <div className="order-number-box">

                <span>
                  Numéro de commande
                </span>

                <strong>
                  {
                    orderResult.order_number
                  }
                </strong>

              </div>


              <div className="success-details">

                <div>
                  <span>
                    Sous-total
                  </span>

                  <strong>
                    {formatPrice(
                      orderResult.subtotal
                    )}{" "}
                    TND
                  </strong>
                </div>


                <div>
                  <span>
                    Livraison
                  </span>

                  <strong>
                    {formatPrice(
                      orderResult.delivery_fee
                    )}{" "}
                    TND
                  </strong>
                </div>


                <div>
                  <span>
                    Total
                  </span>

                  <strong>
                    {formatPrice(
                      orderResult.total
                    )}{" "}
                    TND
                  </strong>
                </div>


                <div>
                  <span>
                    Paiement
                  </span>

                  <strong>
                    À la livraison
                  </strong>
                </div>

              </div>


              <button
                className="success-button"
                onClick={
                  closeCheckout
                }
              >
                Retour à la boutique
              </button>

            </div>

          ) : (

            <div className="checkout-layout">

              <section className="checkout-form-side">

                <div className="checkout-heading">

                  <button
                    className="checkout-close"
                    onClick={
                      closeCheckout
                    }
                  >
                    ×
                  </button>


                  <p className="checkout-eyebrow">
                    FINALISER LA COMMANDE
                  </p>


                  <h2>
                    Livraison
                  </h2>


                  <p>
                    Remplissez vos informations.
                    Paiement à la livraison.
                  </p>

                </div>


                <form
                  className="checkout-form"
                  onSubmit={
                    submitOrder
                  }
                >

                  <div className="checkout-section-title">
                    <span>
                      01
                    </span>

                    <strong>
                      Vos informations
                    </strong>
                  </div>


                  <div className="checkout-fields">

                    <label className="checkout-full">
                      Nom et prénom *

                      <input
                        required
                        minLength={2}
                        value={
                          checkoutForm.customer_name
                        }
                        onChange={
                          event =>
                            updateCheckoutField(
                              "customer_name",
                              event.target.value
                            )
                        }
                        placeholder="Votre nom complet"
                      />
                    </label>


                    <label>
                      Téléphone *

                      <input
                        required
                        minLength={8}
                        value={
                          checkoutForm.phone
                        }
                        onChange={
                          event =>
                            updateCheckoutField(
                              "phone",
                              event.target.value
                            )
                        }
                        placeholder="22 123 456"
                      />
                    </label>


                    <label>
                      E-mail

                      <input
                        type="email"
                        value={
                          checkoutForm.email
                        }
                        onChange={
                          event =>
                            updateCheckoutField(
                              "email",
                              event.target.value
                            )
                        }
                        placeholder="email@example.com"
                      />
                    </label>

                  </div>


                  <div className="checkout-section-title checkout-address-title">
                    <span>
                      02
                    </span>

                    <strong>
                      Adresse de livraison
                    </strong>
                  </div>


                  <div className="checkout-fields">

                    <label>
                      Gouvernorat *

                      <select
                        required
                        value={
                          checkoutForm.governorate
                        }
                        onChange={
                          event =>
                            updateCheckoutField(
                              "governorate",
                              event.target.value
                            )
                        }
                      >

                        <option value="">
                          Choisir
                        </option>

                        {governorates.map(
                          governorate => (
                            <option
                              key={
                                governorate
                              }
                              value={
                                governorate
                              }
                            >
                              {
                                governorate
                              }
                            </option>
                          )
                        )}

                      </select>

                    </label>


                    <label>
                      Ville *

                      <input
                        required
                        minLength={2}
                        value={
                          checkoutForm.city
                        }
                        onChange={
                          event =>
                            updateCheckoutField(
                              "city",
                              event.target.value
                            )
                        }
                        placeholder="Votre ville"
                      />
                    </label>


                    <label className="checkout-full">
                      Adresse complète *

                      <input
                        required
                        minLength={4}
                        value={
                          checkoutForm.address
                        }
                        onChange={
                          event =>
                            updateCheckoutField(
                              "address",
                              event.target.value
                            )
                        }
                        placeholder="Rue, résidence, numéro..."
                      />
                    </label>


                    <label className="checkout-full">
                      Note de commande

                      <textarea
                        rows={4}
                        value={
                          checkoutForm.notes
                        }
                        onChange={
                          event =>
                            updateCheckoutField(
                              "notes",
                              event.target.value
                            )
                        }
                        placeholder="Instructions de livraison, précision..."
                      />
                    </label>

                  </div>


                  <div className="payment-card">

                    <div className="payment-dot"></div>

                    <div>
                      <strong>
                        Paiement à la livraison
                      </strong>

                      <span>
                        Vous payez lors de la réception
                        de votre commande.
                      </span>
                    </div>

                  </div>


                  {orderError && (

                    <div className="checkout-error">
                      {
                        orderError
                      }
                    </div>

                  )}


                  <button
                    className="confirm-order-button"
                    type="submit"
                    disabled={
                      orderSubmitting
                    }
                  >

                    {orderSubmitting
                      ? "Enregistrement..."
                      : "Confirmer ma commande"}

                    {!orderSubmitting && (
                      <span>
                        →
                      </span>
                    )}

                  </button>

                </form>

              </section>


              <aside className="checkout-summary-side">

                <p className="checkout-eyebrow">
                  VOTRE COMMANDE
                </p>


                <h3>
                  Récapitulatif
                </h3>


                <div className="checkout-items">

                  {cartItems.map(
                    item => (

                      <article
                        className="checkout-item"
                        key={`checkout-${item.product.id}-${item.color}`}
                      >

                        <div className="checkout-item-image">

                          {item.product.main_image ? (
                            <img
                              src={
                                imageUrl(
                                  item.product.main_image
                                )
                              }
                              alt={
                                item.product.name
                              }
                            />
                          ) : (
                            <span>
                              ELIO
                            </span>
                          )}


                          <small>
                            {
                              item.quantity
                            }
                          </small>

                        </div>


                        <div className="checkout-item-info">

                          <span>
                            {
                              item.product.category
                            }
                          </span>

                          <strong>
                            {
                              item.product.name
                            }
                          </strong>

                          {item.color && (
                            <p>
                              {
                                item.color
                              }
                            </p>
                          )}

                        </div>


                        <b>
                          {formatPrice(
                            item.product.price *
                              item.quantity
                          )}{" "}
                          TND
                        </b>

                      </article>

                    )
                  )}

                </div>


                <div className="checkout-totals">

                  <div>

                    <span>
                      Sous-total
                    </span>

                    <strong>
                      {formatPrice(
                        cartSubtotal
                      )}{" "}
                      TND
                    </strong>

                  </div>


                  <div>

                    <span>
                      Livraison
                    </span>

                    <strong>
                      {formatPrice(
                        DELIVERY_FEE
                      )}{" "}
                      TND
                    </strong>

                  </div>

                </div>


                <div className="checkout-grand-total">

                  <span>
                    Total
                  </span>

                  <strong>
                    {formatPrice(
                      cartTotal
                    )}{" "}
                    TND
                  </strong>

                </div>


                <div className="checkout-reassurance">

                  <p>
                    ✓ Livraison partout en Tunisie · 8 TND
                  </p>

                  <p>
                    ✓ Paiement à la livraison
                  </p>

                  <p>
                    ✓ Commande enregistrée chez ELIO
                  </p>

                  <p>
                    ✓ Stock vérifié automatiquement
                  </p>

                </div>

              </aside>

            </div>

          )}

        </div>

      </div>

    </div>
  );
}


export default App;