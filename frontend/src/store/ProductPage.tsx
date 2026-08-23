import {
  useEffect,
  useState,
} from "react";

import "./ProductPage.css";

import {
  useCart,
} from "./CartContext";

const API_URL =
  (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000");

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
  created_at: string;
  updated_at: string;
  main_image:
    | string
    | null;
  images: ProductImage[];
};

function ProductPage() {

  const slug =
    decodeURIComponent(
      window.location.pathname
        .replace(
          "/produit/",
          ""
        )
        .replace(
          /\/$/,
          ""
        )
    );

  const [
    product,
    setProduct,
  ] = useState<
    Product |
    null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    selectedImage,
    setSelectedImage,
  ] = useState<
    string |
    null
  >(null);

  const [
    selectedColor,
    setSelectedColor,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  const [
    added,
    setAdded,
  ] = useState(false);

  const {
    cartCount,
    addItem,
  } = useCart();

  /* ====================================================== */
  /* LOAD PRODUCT */
  /* ====================================================== */

  useEffect(() => {

    const loadProduct =
      async () => {

        try {

          setLoading(true);

          setError("");

          const response =
            await fetch(
              `${API_URL}/api/products/${encodeURIComponent(
                slug
              )}`
            );

          if (!response.ok) {

            if (
              response.status ===
              404
            ) {

              throw new Error(
                "Ce produit n'est plus disponible."
              );

            }

            throw new Error(
              "Impossible de charger ce produit."
            );

          }

          const data:
            Product =
            await response.json();

          setProduct(
            data
          );

          setSelectedColor(
            data.colors[0] ||
            ""
          );

          if (
            data.main_image
          ) {

            setSelectedImage(
              data.main_image
            );

          }

        } catch (error) {

          setError(
            error instanceof Error
              ? error.message
              : "Une erreur est survenue."
          );

        } finally {

          setLoading(false);

        }

      };

    loadProduct();

  }, [slug]);

  /* ====================================================== */
  /* HELPERS */
  /* ====================================================== */

  const imageUrl = (
    url:
      | string
      | null
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }
    ).format(
      price
    );

  };

  /* ====================================================== */
  /* QUANTITY */
  /* ====================================================== */

  const decreaseQuantity =
    () => {

      setQuantity(
        previous =>
          Math.max(
            1,
            previous - 1
          )
      );

    };

  const increaseQuantity =
    () => {

      if (!product) {

        return;

      }

      setQuantity(
        previous =>
          Math.min(
            product.stock,
            previous + 1
          )
      );

    };

  /* ====================================================== */
  /* ADD TO CART */
  /* ====================================================== */

  const addToCart =
    () => {

      if (
        !product ||
        product.stock <= 0
      ) {

        return;

      }


      const color =
        selectedColor ||
        product.colors[0] ||
        "";


      addItem(
        product.id,
        color,
        quantity,
        product.stock
      );


      setAdded(
        true
      );


      window.setTimeout(
        () => {

          setAdded(
            false
          );

        },
        2500
      );

    };


  /* ====================================================== */
  /* LOADING */
  /* ====================================================== */

  if (
    loading
  ) {

    return (

      <div className="product-page-state">

        <div className="product-page-loader"></div>

        <p>
          Chargement...
        </p>

      </div>

    );

  }

  /* ====================================================== */
  /* ERROR */
  /* ====================================================== */

  if (
    error ||
    !product
  ) {

    return (

      <div className="product-page-state">

        <a
          href="/"
          className="product-error-logo"
        >
          ELIO
        </a>

        <h1>
          Produit indisponible
        </h1>

        <p>
          {
            error
          }
        </p>

        <a
          href="/"
          className="product-return-button"
        >
          Retour à la boutique
        </a>

      </div>

    );

  }

  const gallery =
    product.images.length >
      0
      ? product.images
      : [];

  return (

    <div className="product-detail-page">

      {/* ================================================== */}
      {/* ANNOUNCEMENT */}
      {/* ================================================== */}

      <div className="product-announcement">

        Livraison disponible dans toute la Tunisie

      </div>

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <header className="product-header">

        <nav>

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
          className="product-header-logo"
        >

          <img
            src="/elio-logo-transparent.png"
            alt="ELIO Maroquinerie"
          />

        </a>

        <nav className="product-header-right">

          <a href="/#maison">
            Maison ELIO
          </a>

          <a href="/?search=1">
            Recherche
          </a>

          <a
            href="/?openCart=1"
            className="product-cart-link"
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

      {/* ================================================== */}
      {/* BREADCRUMB */}
      {/* ================================================== */}

      <div className="product-breadcrumb">

        <a href="/">
          Accueil
        </a>

        <span>
          /
        </span>

        <a href="/collection">
          Collection
        </a>

        <span>
          /
        </span>

        <strong>
          {
            product.name
          }
        </strong>

      </div>

      {/* ================================================== */}
      {/* MAIN PRODUCT */}
      {/* ================================================== */}

      <main className="product-detail-main">

        {/* ================================================ */}
        {/* GALLERY */}
        {/* ================================================ */}

        <section className="product-gallery">

          <div className="product-main-photo">

            {
              selectedImage ? (

                <img
                  src={
                    imageUrl(
                      selectedImage
                    )
                  }
                  alt={
                    product.name
                  }
                />

              ) : (

                <div className="product-main-placeholder">

                  <span>
                    ELIO
                  </span>

                  <small>
                    Photo à venir
                  </small>

                </div>

              )
            }

            {
              product.is_new && (

                <span className="detail-badge">
                  Nouveau
                </span>

              )
            }

          </div>

          {
            gallery.length >
              1 && (

              <div className="product-thumbnails">

                {
                  gallery.map(
                    image => (

                      <button
                        key={
                          image.id
                        }

                        type="button"

                        className={
                          selectedImage ===
                          image.image_url
                            ? "detail-thumbnail detail-thumbnail-active"
                            : "detail-thumbnail"
                        }

                        onClick={
                          () =>
                            setSelectedImage(
                              image.image_url
                            )
                        }
                      >

                        <img
                          src={
                            imageUrl(
                              image.image_url
                            )
                          }
                          alt=""
                        />

                      </button>

                    )
                  )
                }

              </div>

            )
          }

        </section>

        {/* ================================================ */}
        {/* PRODUCT INFORMATION */}
        {/* ================================================ */}

        <section className="product-detail-info">

          <p className="detail-category">

            {
              product.category
            }

          </p>

          <h1>

            {
              product.name
            }

          </h1>

          <div className="detail-price">

            {
              product.compare_at_price &&
              product.compare_at_price >
                product.price && (

                <span className="detail-old-price">

                  {
                    formatPrice(
                      product.compare_at_price
                    )
                  }{" "}
                  TND

                </span>

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

          {
            product.description && (

              <p className="detail-description">

                {
                  product.description
                }

              </p>

            )
          }

          <div className="detail-divider"></div>

          {/* COLORS */}

          {
            product.colors.length >
              0 && (

              <div className="detail-option">

                <div className="detail-option-heading">

                  <span>
                    Couleur
                  </span>

                  <strong>
                    {
                      selectedColor
                    }
                  </strong>

                </div>

                <div className="detail-colors">

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
                              ? "detail-color detail-color-active"
                              : "detail-color"
                          }

                          onClick={
                            () =>
                              setSelectedColor(
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

          {/* QUANTITY */}

          <div className="detail-option">

            <div className="detail-option-heading">

              <span>
                Quantité
              </span>

              {
                product.stock >
                  0 && (

                  <small>

                    {
                      product.stock
                    } en stock

                  </small>

                )
              }

            </div>

            <div className="detail-quantity">

              <button
                type="button"
                onClick={
                  decreaseQuantity
                }
                disabled={
                  quantity <= 1
                }
              >
                −
              </button>

              <span>
                {
                  quantity
                }
              </span>

              <button
                type="button"
                onClick={
                  increaseQuantity
                }
                disabled={
                  quantity >=
                  product.stock
                }
              >
                +
              </button>

            </div>

          </div>

          {/* ADD TO CART */}

          <button
            type="button"

            className="detail-add-cart"

            disabled={
              product.stock <=
              0
            }

            onClick={
              addToCart
            }
          >

            {
              product.stock >
                0
                ? (
                  <>
                    Ajouter au panier

                    <span>
                      {
                        formatPrice(
                          product.price *
                          quantity
                        )
                      }{" "}
                      TND
                    </span>
                  </>
                )
                : "Rupture de stock"
            }

          </button>

          {
            added && (

              <div className="product-added-message">

                ✓ Produit ajouté au panier.

                <a href="/?openCart=1">
                  Voir le panier →
                </a>

              </div>

            )
          }

          {/* REASSURANCE */}

          <div className="detail-benefits">

            <div>

              <span>
                01
              </span>

              <div>
                <strong>
                  Livraison en Tunisie
                </strong>

                <small>
                  Partout en Tunisie
                </small>
              </div>

            </div>

            <div>

              <span>
                02
              </span>

              <div>
                <strong>
                  Paiement
                </strong>

                <small>
                  À la livraison
                </small>
              </div>

            </div>

          </div>

          {/* SPECIFICATIONS */}

          <div className="product-specifications">

            {
              product.material && (

                <div>

                  <span>
                    Matière
                  </span>

                  <strong>
                    {
                      product.material
                    }
                  </strong>

                </div>

              )
            }

            {
              product.dimensions && (

                <div>

                  <span>
                    Dimensions
                  </span>

                  <strong>
                    {
                      product.dimensions
                    }
                  </strong>

                </div>

              )
            }

            <div>

              <span>
                Référence
              </span>

              <strong>
                {
                  product.sku
                }
              </strong>

            </div>

          </div>

        </section>

      </main>

      {/* ================================================== */}
      {/* STORY */}
      {/* ================================================== */}

      <section className="product-story">

        <p>
          L'UNIVERS ELIO
        </p>

        <h2>

          Une pièce pensée

          <br />

          pour vous accompagner.

        </h2>

        <span>

          Une esthétique intemporelle,
          une présence affirmée et
          l'élégance ELIO dans chaque détail.

        </span>

      </section>

      {/* ================================================== */}
      {/* FOOTER */}
      {/* ================================================== */}

      <footer className="product-page-footer">

        <div>

          <img
            src="/elio-logo-transparent.png"
            alt="ELIO"
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

          <a href="/nouveautes">
            Nouveautés
          </a>

          <a href="/collection/sacs">
            Sacs
          </a>

          <a href="/collection">
            Collection
          </a>

        </div>

        <div>

          <strong>
            ELIO
          </strong>

          <a href="/#maison">
            Maison ELIO
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

          <a href="/">
            Accueil
          </a>

        </div>

      </footer>

    </div>

  );

}

export default ProductPage;
