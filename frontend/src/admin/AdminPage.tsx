import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import "./AdminPage.css";


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


type ProductForm = {
  name: string;
  category: string;
  price: string;
  compare_at_price: string;
  stock: string;
  colors: string;
  material: string;
  dimensions: string;
  description: string;
  sku: string;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
};


type OrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  color: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  image_url: string | null;
  created_at: string;
};


type Order = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  governorate: string;
  city: string;
  address: string;
  notes: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
};


type NewsletterSubscriber = {
  id: number;
  email: string;
  is_active: boolean;
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
};


type AdminSection =
  | "products"
  | "orders"
  | "clients"
  | "newsletter"
  | "statistics";


type ClientRecord = {
  key: string;
  name: string;
  phone: string;
  email: string;
  governorate: string;
  city: string;
  address: string;
  ordersCount: number;
  activeOrdersCount: number;
  totalSpent: number;
  lastOrderAt: string;
  lastOrder: Order;
};


type RankedItem = {
  key: string;
  label: string;
  secondary: string;
  quantity: number;
  revenue: number;
};


const emptyForm: ProductForm = {
  name: "",
  category: "Sacs",
  price: "",
  compare_at_price: "",
  stock: "0",
  colors: "",
  material: "",
  dimensions: "",
  description: "",
  sku: "",
  is_new: false,
  is_featured: false,
  is_active: true,
};


const orderStatuses = [
  "Nouvelle",
  "À confirmer",
  "Confirmée",
  "En préparation",
  "Expédiée",
  "Livrée",
  "Annulée",
];


const statusClass = (
  status: string
) => {

  const normalized =
    status
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /\s+/g,
        "-"
      );


  return `status-${normalized}`;

};


function AdminPage() {

  const [
    adminKey,
    setAdminKey,
  ] =
    useState(
      localStorage.getItem(
        "elio-admin-key"
      ) || ""
    );


  const [
    authenticated,
    setAuthenticated,
  ] =
    useState(
      false
    );


  const [
    section,
    setSection,
  ] =
    useState<AdminSection>(
      "products"
    );


  const [
    products,
    setProducts,
  ] =
    useState<Product[]>(
      []
    );


  const [
    orders,
    setOrders,
  ] =
    useState<Order[]>(
      []
    );


  const [
    newsletterSubscribers,
    setNewsletterSubscribers,
  ] =
    useState<NewsletterSubscriber[]>(
      []
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  const [
    ordersLoading,
    setOrdersLoading,
  ] =
    useState(
      false
    );


  const [
    newsletterLoading,
    setNewsletterLoading,
  ] =
    useState(
      false
    );


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );


  const [
    messageType,
    setMessageType,
  ] =
    useState<
      "success" |
      "error" |
      ""
    >(
      ""
    );


  const [
    form,
    setForm,
  ] =
    useState<ProductForm>(
      emptyForm
    );


  const [
    selectedImages,
    setSelectedImages,
  ] =
    useState<File[]>(
      []
    );


  const [
    editingProduct,
    setEditingProduct,
  ] =
    useState<Product | null>(
      null
    );


  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );


  const [
    orderSearch,
    setOrderSearch,
  ] =
    useState(
      ""
    );


  const [
    orderStatusFilter,
    setOrderStatusFilter,
  ] =
    useState(
      "Tous"
    );


  const [
    clientSearch,
    setClientSearch,
  ] =
    useState(
      ""
    );


  const [
    newsletterSearch,
    setNewsletterSearch,
  ] =
    useState(
      ""
    );


  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<Product | null>(
      null
    );


  const [
    selectedOrder,
    setSelectedOrder,
  ] =
    useState<Order | null>(
      null
    );


  const showMessage = (
    text: string,
    type:
      "success" |
      "error"
  ) => {

    setMessage(
      text
    );


    setMessageType(
      type
    );


    window.setTimeout(
      () => {

        setMessage(
          ""
        );


        setMessageType(
          ""
        );

      },
      4200
    );

  };


  const imageUrl = (
    url: string | null
  ) => {

    if (
      !url
    ) {

      return "";

    }


    return url.startsWith(
      "http"
    )
      ? url
      : `${API_URL}${url}`;

  };


  const formatPrice = (
    value: number
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
      value
    );

  };


  const formatDate = (
    value: string
  ) => {

    try {

      return new Intl.DateTimeFormat(
        "fr-TN",
        {
          dateStyle:
            "medium",

          timeStyle:
            "short",
        }
      ).format(
        new Date(
          value
        )
      );

    } catch {

      return value;

    }

  };


  const normalizePhone = (
    phone: string
  ) => {

    return phone.replace(
      /\D/g,
      ""
    );

  };


  const whatsappPhone = (
    phone: string
  ) => {

    let cleaned =
      normalizePhone(
        phone
      );


    if (
      cleaned.startsWith(
        "00216"
      )
    ) {

      cleaned =
        cleaned.slice(
          2
        );

    }


    if (
      cleaned.length ===
      8
    ) {

      cleaned =
        `216${cleaned}`;

    }


    return cleaned;

  };


  const openWhatsApp = (
    order: Order
  ) => {

    const phone =
      whatsappPhone(
        order.phone
      );


    const text =
      `Bonjour ${order.customer_name}, ` +
      `nous vous contactons concernant votre commande ` +
      `${order.order_number} chez ELIO Maroquinerie.`;


    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        text
      )}`,
      "_blank"
    );

  };


  const loadProducts =
    async (
      key =
        adminKey
    ) => {

      if (
        !key
      ) {

        return;

      }


      setLoading(
        true
      );


      try {

        const response =
          await fetch(
            `${API_URL}/api/admin/products`,
            {
              headers: {
                "X-Admin-Key":
                  key,
              },
            }
          );


        if (
          !response.ok
        ) {

          throw new Error(
            "Clé administrateur incorrecte."
          );

        }


        const data:
          Product[] =
          await response.json();


        setProducts(
          data
        );


        setAuthenticated(
          true
        );


        localStorage.setItem(
          "elio-admin-key",
          key
        );

      } catch (
        error
      ) {

        setAuthenticated(
          false
        );


        showMessage(
          error instanceof
            Error
            ? error.message
            : "Erreur de connexion.",
          "error"
        );

      } finally {

        setLoading(
          false
        );

      }

    };


  const loadOrders =
    async (
      key =
        adminKey
    ) => {

      if (
        !key
      ) {

        return;

      }


      setOrdersLoading(
        true
      );


      try {

        const response =
          await fetch(
            `${API_URL}/api/admin/orders`,
            {
              headers: {
                "X-Admin-Key":
                  key,
              },
            }
          );


        if (
          !response.ok
        ) {

          throw new Error(
            "Impossible de charger les commandes."
          );

        }


        const data:
          Order[] =
          await response.json();


        setOrders(
          data
        );

      } catch (
        error
      ) {

        showMessage(
          error instanceof
            Error
            ? error.message
            : "Erreur de chargement des commandes.",
          "error"
        );

      } finally {

        setOrdersLoading(
          false
        );

      }

    };


  const loadNewsletter =
    async (
      key =
        adminKey
    ) => {

      if (
        !key
      ) {

        return;

      }


      setNewsletterLoading(
        true
      );


      try {

        const response =
          await fetch(
            `${API_URL}/api/admin/newsletter`,
            {
              headers: {
                "X-Admin-Key":
                  key,
              },
            }
          );


        if (
          !response.ok
        ) {

          throw new Error(
            "Impossible de charger les abonnés newsletter."
          );

        }


        const data:
          NewsletterSubscriber[] =
          await response.json();


        setNewsletterSubscribers(
          data
        );

      } catch (
        error
      ) {

        showMessage(
          error instanceof
            Error
            ? error.message
            : "Erreur de chargement de la newsletter.",
          "error"
        );

      } finally {

        setNewsletterLoading(
          false
        );

      }

    };


  useEffect(
    () => {

      if (
        adminKey
      ) {

        void Promise.all(
          [
            loadProducts(
              adminKey
            ),

            loadOrders(
              adminKey
            ),

            loadNewsletter(
              adminKey
            ),
          ]
        );

      }

    },
    []
  );


  const handleLogin =
    async (
      event:
        FormEvent
    ) => {

      event.preventDefault();


      await loadProducts(
        adminKey
      );


      await loadOrders(
        adminKey
      );


      await loadNewsletter(
        adminKey
      );

    };


  const logout =
    () => {

      localStorage.removeItem(
        "elio-admin-key"
      );


      setAuthenticated(
        false
      );


      setAdminKey(
        ""
      );


      setProducts(
        []
      );


      setOrders(
        []
      );


      setNewsletterSubscribers(
        []
      );

    };


  const handleInput = (
    event:
      ChangeEvent<
        HTMLInputElement |
        HTMLTextAreaElement |
        HTMLSelectElement
      >
  ) => {

    const {
      name,
      value,
    } =
      event.target;


    setForm(
      previous => ({
        ...previous,

        [name]:
          value,
      })
    );

  };


  const handleCheckbox = (
    event:
      ChangeEvent<
        HTMLInputElement
      >
  ) => {

    const {
      name,
      checked,
    } =
      event.target;


    setForm(
      previous => ({
        ...previous,

        [name]:
          checked,
      })
    );

  };


  const handleImages = (
    event:
      ChangeEvent<
        HTMLInputElement
      >
  ) => {

    const incomingImages =
      Array.from(
        event.target.files ||
        []
      );


    if (
      incomingImages.length ===
      0
    ) {

      return;

    }


    setSelectedImages(
      previous => {

        const existingKeys =
          new Set(
            previous.map(
              image =>
                `${image.name}-${image.size}-${image.lastModified}`
            )
          );


        const newImages =
          incomingImages.filter(
            image => {

              const key =
                `${image.name}-${image.size}-${image.lastModified}`;


              if (
                existingKeys.has(
                  key
                )
              ) {

                return false;

              }


              existingKeys.add(
                key
              );


              return true;

            }
          );


        return [
          ...previous,
          ...newImages,
        ];

      }
    );


    // Reset the native input so the user can reopen
    // the picker as many times as needed.
    event.target.value =
      "";

  };


  const resetForm =
    () => {

      setForm(
        emptyForm
      );


      setSelectedImages(
        []
      );


      setEditingProduct(
        null
      );

    };


  const createProduct =
    async () => {

      const data =
        new FormData();


      data.append(
        "name",
        form.name
      );


      data.append(
        "category",
        form.category
      );


      data.append(
        "price",
        form.price
      );


      if (
        form.compare_at_price
      ) {

        data.append(
          "compare_at_price",
          form.compare_at_price
        );

      }


      data.append(
        "stock",
        form.stock ||
        "0"
      );


      data.append(
        "colors",
        form.colors
      );


      data.append(
        "material",
        form.material
      );


      data.append(
        "dimensions",
        form.dimensions
      );


      data.append(
        "description",
        form.description
      );


      data.append(
        "sku",
        form.sku
      );


      data.append(
        "is_new",
        String(
          form.is_new
        )
      );


      data.append(
        "is_featured",
        String(
          form.is_featured
        )
      );


      data.append(
        "is_active",
        String(
          form.is_active
        )
      );


      selectedImages.forEach(
        image => {

          data.append(
            "images",
            image
          );

        }
      );


      const response =
        await fetch(
          `${API_URL}/api/admin/products`,
          {
            method:
              "POST",

            headers: {
              "X-Admin-Key":
                adminKey,
            },

            body:
              data,
          }
        );


      const result =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          result.detail ||
          "Impossible de créer le produit."
        );

      }

    };


  const updateProduct =
    async (
      product:
        Product
    ) => {

      const payload = {

        name:
          form.name,

        category:
          form.category,

        price:
          Number(
            form.price
          ),

        compare_at_price:
          form.compare_at_price
            ? Number(
                form.compare_at_price
              )
            : null,

        description:
          form.description,

        material:
          form.material,

        dimensions:
          form.dimensions,

        colors:
          form.colors
            .split(
              ","
            )
            .map(
              color =>
                color.trim()
            )
            .filter(
              Boolean
            ),

        stock:
          Number(
            form.stock
          ),

        is_new:
          form.is_new,

        is_featured:
          form.is_featured,

        is_active:
          form.is_active,
      };


      const response =
        await fetch(
          `${API_URL}/api/admin/products/${product.id}`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",

              "X-Admin-Key":
                adminKey,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );


      const result =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          result.detail ||
          "Impossible de modifier le produit."
        );

      }


      if (
        selectedImages.length >
        0
      ) {

        const data =
          new FormData();


        selectedImages.forEach(
          image => {

            data.append(
              "images",
              image
            );

          }
        );


        const imageResponse =
          await fetch(
            `${API_URL}/api/admin/products/${product.id}/images`,
            {
              method:
                "POST",

              headers: {
                "X-Admin-Key":
                  adminKey,
              },

              body:
                data,
            }
          );


        if (
          !imageResponse.ok
        ) {

          const errorData =
            await imageResponse.json();


          throw new Error(
            errorData.detail ||
            "Produit modifié, mais erreur pendant l'ajout des images."
          );

        }

      }

    };


  const submitProduct =
    async (
      event:
        FormEvent
    ) => {

      event.preventDefault();


      if (
        !form.name.trim()
      ) {

        showMessage(
          "Entrez le nom du produit.",
          "error"
        );


        return;

      }


      if (
        !form.price ||
        Number(
          form.price
        ) <
        0
      ) {

        showMessage(
          "Entrez un prix valide.",
          "error"
        );


        return;

      }


      setSaving(
        true
      );


      try {

        if (
          editingProduct
        ) {

          await updateProduct(
            editingProduct
          );


          showMessage(
            "Produit modifié avec succès.",
            "success"
          );

        } else {

          await createProduct();


          showMessage(
            "Produit ajouté à ELIO avec succès.",
            "success"
          );

        }


        resetForm();


        await loadProducts();

      } catch (
        error
      ) {

        showMessage(
          error instanceof
            Error
            ? error.message
            : "Une erreur est survenue.",
          "error"
        );

      } finally {

        setSaving(
          false
        );

      }

    };


  const startEditing = (
    product:
      Product
  ) => {

    setEditingProduct(
      product
    );


    setForm(
      {
        name:
          product.name,

        category:
          product.category,

        price:
          String(
            product.price
          ),

        compare_at_price:
          product.compare_at_price
            ? String(
                product.compare_at_price
              )
            : "",

        stock:
          String(
            product.stock
          ),

        colors:
          product.colors.join(
            ", "
          ),

        material:
          product.material,

        dimensions:
          product.dimensions,

        description:
          product.description,

        sku:
          product.sku,

        is_new:
          product.is_new,

        is_featured:
          product.is_featured,

        is_active:
          product.is_active,
      }
    );


    setSelectedImages(
      []
    );


    window.scrollTo(
      {
        top:
          0,

        behavior:
          "smooth",
      }
    );

  };


  const deleteProduct =
    async () => {

      if (
        !deleteTarget
      ) {

        return;

      }


      try {

        const response =
          await fetch(
            `${API_URL}/api/admin/products/${deleteTarget.id}`,
            {
              method:
                "DELETE",

              headers: {
                "X-Admin-Key":
                  adminKey,
              },
            }
          );


        if (
          !response.ok
        ) {

          const result =
            await response.json();


          throw new Error(
            result.detail ||
            "Impossible de supprimer le produit."
          );

        }


        setDeleteTarget(
          null
        );


        showMessage(
          "Produit supprimé.",
          "success"
        );


        await loadProducts();

      } catch (
        error
      ) {

        showMessage(
          error instanceof
            Error
            ? error.message
            : "Erreur de suppression.",
          "error"
        );

      }

    };


  const deleteImage =
    async (
      productId:
        number,

      imageId:
        number
    ) => {

      const confirmed =
        window.confirm(
          "Supprimer cette image ?"
        );


      if (
        !confirmed
      ) {

        return;

      }


      try {

        const response =
          await fetch(
            `${API_URL}/api/admin/products/${productId}/images/${imageId}`,
            {
              method:
                "DELETE",

              headers: {
                "X-Admin-Key":
                  adminKey,
              },
            }
          );


        if (
          !response.ok
        ) {

          throw new Error(
            "Impossible de supprimer l'image."
          );

        }


        showMessage(
          "Image supprimée.",
          "success"
        );


        await loadProducts();

      } catch (
        error
      ) {

        showMessage(
          error instanceof
            Error
            ? error.message
            : "Erreur.",
          "error"
        );

      }

    };


  const updateOrderStatus =
    async (
      order:
        Order,

      newStatus:
        string
    ) => {

      try {

        const response =
          await fetch(
            `${API_URL}/api/admin/orders/${order.id}/status`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                "X-Admin-Key":
                  adminKey,
              },

              body:
                JSON.stringify(
                  {
                    status:
                      newStatus,
                  }
                ),
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {

          throw new Error(
            data.detail ||
            "Impossible de modifier le statut."
          );

        }


        setOrders(
          previous =>
            previous.map(
              item =>
                item.id ===
                order.id
                  ? {
                      ...item,

                      status:
                        newStatus,
                    }
                  : item
            )
        );


        setSelectedOrder(
          previous =>
            previous?.id ===
            order.id
              ? {
                  ...previous,

                  status:
                    newStatus,
                }
              : previous
        );


        showMessage(
          `Commande ${order.order_number} : ${newStatus}`,
          "success"
        );

      } catch (
        error
      ) {

        showMessage(
          error instanceof
            Error
            ? error.message
            : "Erreur de statut.",
          "error"
        );

      }

    };


  const deleteOrder =
    async (
      order:
        Order
    ) => {

      const confirmed =
        window.confirm(
          `Supprimer la commande ${order.order_number} ?\n\n` +
          "Elle disparaîtra de Commandes, Clients et Statistiques. " +
          "Le stock sera restauré automatiquement si la commande " +
          "est encore active."
        );


      if (
        !confirmed
      ) {

        return;

      }


      try {

        const response =
          await fetch(
            `${API_URL}/api/admin/orders/${order.id}`,
            {
              method:
                "DELETE",

              headers: {
                "X-Admin-Key":
                  adminKey,
              },
            }
          );


        const data =
          await response
            .json()
            .catch(
              () => null
            );


        if (
          !response.ok
        ) {

          throw new Error(
            data &&
            typeof data.detail ===
              "string"
              ? data.detail
              : "Impossible de supprimer la commande."
          );

        }


        setOrders(
          previous =>
            previous.filter(
              item =>
                item.id !==
                order.id
            )
        );


        setSelectedOrder(
          previous =>
            previous?.id ===
            order.id
              ? null
              : previous
        );


        showMessage(
          data &&
          typeof data.message ===
            "string"
            ? data.message
            : `Commande ${order.order_number} supprimée.`,
          "success"
        );


        // The backend may restore reserved stock while
        // deleting the order, so refresh the catalogue.
        await loadProducts();

      } catch (
        error
      ) {

        showMessage(
          error instanceof
            Error
            ? error.message
            : "Erreur de suppression de la commande.",
          "error"
        );

      }

    };


  const deleteNewsletterSubscriber =
    async (
      subscriber:
        NewsletterSubscriber
    ) => {

      const confirmed =
        window.confirm(
          `Supprimer ${subscriber.email} de la newsletter ?`
        );


      if (
        !confirmed
      ) {

        return;

      }


      try {

        const response =
          await fetch(
            `${API_URL}/api/admin/newsletter/${subscriber.id}`,
            {
              method:
                "DELETE",

              headers: {
                "X-Admin-Key":
                  adminKey,
              },
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {

          throw new Error(
            data.detail ||
            "Impossible de supprimer cet abonné."
          );

        }


        setNewsletterSubscribers(
          previous =>
            previous.filter(
              item =>
                item.id !==
                subscriber.id
            )
        );


        showMessage(
          "Abonné newsletter supprimé.",
          "success"
        );

      } catch (
        error
      ) {

        showMessage(
          error instanceof
            Error
            ? error.message
            : "Erreur de suppression.",
          "error"
        );

      }

    };


  const copyNewsletterEmail =
    async (
      email:
        string
    ) => {

      try {

        await navigator.clipboard.writeText(
          email
        );


        showMessage(
          "Adresse e-mail copiée.",
          "success"
        );

      } catch {

        showMessage(
          "Impossible de copier l'adresse e-mail.",
          "error"
        );

      }

    };


  const filteredProducts =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        if (
          !query
        ) {

          return products;

        }


        return products.filter(
          product =>
            product.name
              .toLowerCase()
              .includes(
                query
              ) ||

            product.sku
              .toLowerCase()
              .includes(
                query
              ) ||

            product.category
              .toLowerCase()
              .includes(
                query
              )
        );

      },
      [
        products,
        search,
      ]
    );


  const filteredOrders =
    useMemo(
      () => {

        const query =
          orderSearch
            .trim()
            .toLowerCase();


        return orders.filter(
          order => {

            const matchesStatus =
              orderStatusFilter ===
                "Tous" ||
              order.status ===
                orderStatusFilter;


            const matchesSearch =
              !query ||

              order.order_number
                .toLowerCase()
                .includes(
                  query
                ) ||

              order.customer_name
                .toLowerCase()
                .includes(
                  query
                ) ||

              order.phone
                .toLowerCase()
                .includes(
                  query
                ) ||

              order.governorate
                .toLowerCase()
                .includes(
                  query
                ) ||

              order.city
                .toLowerCase()
                .includes(
                  query
                );


            return (
              matchesStatus &&
              matchesSearch
            );

          }
        );

      },
      [
        orders,
        orderSearch,
        orderStatusFilter,
      ]
    );


  const totalStock =
    useMemo(
      () =>
        products.reduce(
          (
            total,
            product
          ) =>
            total +
            product.stock,
          0
        ),
      [
        products,
      ]
    );


  const visibleProducts =
    products.filter(
      product =>
        product.is_active
    ).length;


  const outOfStock =
    products.filter(
      product =>
        product.stock <=
        0
    ).length;


  const clients =
    useMemo<
      ClientRecord[]
    >(
      () => {

        const map =
          new Map<
            string,
            ClientRecord
          >();


        const sorted =
          [
            ...orders,
          ].sort(
            (
              first,
              second
            ) =>
              new Date(
                first.created_at
              ).getTime() -
              new Date(
                second.created_at
              ).getTime()
          );


        sorted.forEach(
          order => {

            const normalized =
              normalizePhone(
                order.phone
              );


            const key =
              normalized ||
              order.email
                ?.toLowerCase() ||
              `order-${order.id}`;


            const previous =
              map.get(
                key
              );


            const activeValue =
              order.status ===
              "Annulée"
                ? 0
                : order.total;


            if (
              !previous
            ) {

              map.set(
                key,
                {
                  key,

                  name:
                    order.customer_name,

                  phone:
                    order.phone,

                  email:
                    order.email ||
                    "",

                  governorate:
                    order.governorate,

                  city:
                    order.city,

                  address:
                    order.address,

                  ordersCount:
                    1,

                  activeOrdersCount:
                    order.status ===
                      "Annulée"
                      ? 0
                      : 1,

                  totalSpent:
                    activeValue,

                  lastOrderAt:
                    order.created_at,

                  lastOrder:
                    order,
                }
              );


              return;

            }


            previous.name =
              order.customer_name ||
              previous.name;


            previous.phone =
              order.phone ||
              previous.phone;


            previous.email =
              order.email ||
              previous.email;


            previous.governorate =
              order.governorate ||
              previous.governorate;


            previous.city =
              order.city ||
              previous.city;


            previous.address =
              order.address ||
              previous.address;


            previous.ordersCount +=
              1;


            if (
              order.status !==
              "Annulée"
            ) {

              previous.activeOrdersCount +=
                1;

            }


            previous.totalSpent +=
              activeValue;


            previous.lastOrderAt =
              order.created_at;


            previous.lastOrder =
              order;

          }
        );


        return Array.from(
          map.values()
        ).sort(
          (
            first,
            second
          ) =>
            new Date(
              second.lastOrderAt
            ).getTime() -
            new Date(
              first.lastOrderAt
            ).getTime()
        );

      },
      [
        orders,
      ]
    );


  const filteredClients =
    useMemo(
      () => {

        const query =
          clientSearch
            .trim()
            .toLowerCase();


        if (
          !query
        ) {

          return clients;

        }


        return clients.filter(
          client =>
            [
              client.name,
              client.phone,
              client.email,
              client.governorate,
              client.city,
              client.address,
            ].some(
              value =>
                value
                  .toLowerCase()
                  .includes(
                    query
                  )
            )
        );

      },
      [
        clients,
        clientSearch,
      ]
    );


  const activeOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.status !==
            "Annulée"
        ),
      [
        orders,
      ]
    );


  const newOrders =
    orders.filter(
      order =>
        order.status ===
        "Nouvelle"
    ).length;


  const processingOrders =
    orders.filter(
      order =>
        [
          "À confirmer",
          "Confirmée",
          "En préparation",
          "Expédiée",
        ].includes(
          order.status
        )
    ).length;


  const deliveredOrders =
    orders.filter(
      order =>
        order.status ===
        "Livrée"
    ).length;


  const totalRevenue =
    activeOrders.reduce(
      (
        total,
        order
      ) =>
        total +
        order.total,
      0
    );


  const deliveredRevenue =
    orders
      .filter(
        order =>
          order.status ===
          "Livrée"
      )
      .reduce(
        (
          total,
          order
        ) =>
          total +
          order.total,
        0
      );


  const averageOrder =
    activeOrders.length
      ? totalRevenue /
        activeOrders.length
      : 0;


  const itemsSold =
    activeOrders.reduce(
      (
        total,
        order
      ) =>
        total +
        order.items.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.quantity,
          0
        ),
      0
    );


  const repeatClients =
    clients.filter(
      client =>
        client.activeOrdersCount >
        1
    ).length;


  const averageClientValue =
    clients.length
      ? clients.reduce(
          (
            total,
            client
          ) =>
            total +
            client.totalSpent,
          0
        ) /
        clients.length
      : 0;


  const statusStats =
    useMemo(
      () =>
        orderStatuses.map(
          status => ({
            status,

            count:
              orders.filter(
                order =>
                  order.status ===
                  status
              ).length,
          })
        ),
      [
        orders,
      ]
    );


  const maxStatusCount =
    Math.max(
      1,
      ...statusStats.map(
        item =>
          item.count
      )
    );


  const topProducts =
    useMemo<
      RankedItem[]
    >(
      () => {

        const map =
          new Map<
            string,
            RankedItem
          >();


        activeOrders.forEach(
          order => {

            order.items.forEach(
              item => {

                const key =
                  item.sku ||
                  item.product_name;


                const current =
                  map.get(
                    key
                  ) ||
                  {
                    key,

                    label:
                      item.product_name,

                    secondary:
                      item.sku,

                    quantity:
                      0,

                    revenue:
                      0,
                  };


                current.quantity +=
                  item.quantity;


                current.revenue +=
                  item.line_total;


                map.set(
                  key,
                  current
                );

              }
            );

          }
        );


        return Array.from(
          map.values()
        )
          .sort(
            (
              first,
              second
            ) =>
              second.quantity -
                first.quantity ||
              second.revenue -
                first.revenue
          )
          .slice(
            0,
            5
          );

      },
      [
        activeOrders,
      ]
    );


  const topClients =
    useMemo(
      () =>
        [
          ...clients,
        ]
          .sort(
            (
              first,
              second
            ) =>
              second.totalSpent -
              first.totalSpent
          )
          .slice(
            0,
            5
          ),
      [
        clients,
      ]
    );


  const governorateStats =
    useMemo<
      RankedItem[]
    >(
      () => {

        const map =
          new Map<
            string,
            RankedItem
          >();


        activeOrders.forEach(
          order => {

            const key =
              order.governorate ||
              "Non renseigné";


            const current =
              map.get(
                key
              ) ||
              {
                key,

                label:
                  key,

                secondary:
                  "",

                quantity:
                  0,

                revenue:
                  0,
              };


            current.quantity +=
              1;


            current.revenue +=
              order.total;


            map.set(
              key,
              current
            );

          }
        );


        return Array.from(
          map.values()
        )
          .sort(
            (
              first,
              second
            ) =>
              second.quantity -
                first.quantity ||
              second.revenue -
                first.revenue
          )
          .slice(
            0,
            8
          );

      },
      [
        activeOrders,
      ]
    );


  const filteredNewsletterSubscribers =
    useMemo(
      () => {

        const query =
          newsletterSearch
            .trim()
            .toLowerCase();


        if (
          !query
        ) {

          return newsletterSubscribers;

        }


        return newsletterSubscribers.filter(
          subscriber =>
            subscriber.email
              .toLowerCase()
              .includes(
                query
              ) ||

            subscriber.source
              .toLowerCase()
              .includes(
                query
              )
        );

      },
      [
        newsletterSubscribers,
        newsletterSearch,
      ]
    );


  const activeNewsletterSubscribers =
    newsletterSubscribers.filter(
      subscriber =>
        subscriber.is_active
    ).length;


  const inactiveNewsletterSubscribers =
    newsletterSubscribers.length -
    activeNewsletterSubscribers;


  const newsletterLast30Days =
    newsletterSubscribers.filter(
      subscriber => {

        const subscribedAt =
          new Date(
            subscriber.subscribed_at
          ).getTime();


        if (
          Number.isNaN(
            subscribedAt
          )
        ) {

          return false;

        }


        return (
          Date.now() -
          subscribedAt
        ) <=
        30 *
        24 *
        60 *
        60 *
        1000;

      }
    ).length;


  if (
    !authenticated
  ) {

    return (

      <div className="admin-login">

        <div className="admin-login-card">

          <a
            href="/"
            className="admin-login-logo"
          >

            <img
              src="/elio-logo-transparent.png"
              alt="ELIO Maroquinerie"
            />

          </a>


          <p className="admin-eyebrow">
            ADMINISTRATION
          </p>


          <h1>
            ELIO Back Office
          </h1>


          <p className="admin-login-description">

            Connectez-vous pour gérer
            la boutique ELIO.

          </p>


          <form
            onSubmit={
              handleLogin
            }
          >

            <label>

              Clé administrateur

              <input
                type="password"
                value={
                  adminKey
                }
                onChange={
                  event =>
                    setAdminKey(
                      event.target.value
                    )
                }
                placeholder="Votre clé admin"
                autoFocus
              />

            </label>


            <button
              type="submit"
              disabled={
                loading
              }
            >

              {
                loading
                  ? "Connexion..."
                  : "Se connecter"
              }

            </button>

          </form>


          {
            message && (

              <div
                className={`admin-alert ${messageType}`}
              >

                {
                  message
                }

              </div>

            )
          }


          <a
            href="/"
            className="back-store"
          >

            ← Retour à la boutique

          </a>

        </div>

      </div>

    );

  }


  return (

    <div className="admin">


      <header className="admin-header">

        <a
          href="/"
          className="admin-brand"
          aria-label="ELIO Maroquinerie"
        >

          <img
            src="/elio-logo-transparent.png"
            alt="ELIO Maroquinerie"
          />

        </a>


        <div className="admin-header-actions">

          <button
            type="button"
            onClick={() => {

              void loadProducts();

              void loadOrders();

              void loadNewsletter();

            }}
          >

            Actualiser

          </button>


          <a
            href="/"
            target="_blank"
            rel="noreferrer"
          >

            Voir la boutique ↗

          </a>


          <button
            type="button"
            onClick={
              logout
            }
          >

            Déconnexion

          </button>

        </div>

      </header>


      <div className="admin-layout">


        <aside className="admin-sidebar">

          <p className="sidebar-label">
            MENU
          </p>


          <button
            type="button"
            className={
              section ===
              "products"
                ? "sidebar-active"
                : ""
            }
            onClick={() =>
              setSection(
                "products"
              )
            }
          >

            <span>
              ▦
            </span>

            Produits

          </button>


          <button
            type="button"
            className={
              section ===
              "orders"
                ? "sidebar-active"
                : ""
            }
            onClick={() =>
              setSection(
                "orders"
              )
            }
          >

            <span>
              ◇
            </span>

            Commandes


            {
              orders.length >
              0 && (

                <b className="sidebar-badge">

                  {
                    orders.length
                  }

                </b>

              )
            }

          </button>


          <button
            type="button"
            className={
              section ===
              "clients"
                ? "sidebar-active"
                : ""
            }
            onClick={() =>
              setSection(
                "clients"
              )
            }
          >

            <span>
              ○
            </span>

            Clients


            {
              clients.length >
              0 && (

                <b className="sidebar-badge">

                  {
                    clients.length
                  }

                </b>

              )
            }

          </button>


          <button
            type="button"
            className={
              section ===
              "newsletter"
                ? "sidebar-active"
                : ""
            }
            onClick={() =>
              setSection(
                "newsletter"
              )
            }
          >

            <span>
              ✉
            </span>

            Newsletter


            {
              activeNewsletterSubscribers >
              0 && (

                <b className="sidebar-badge">

                  {
                    activeNewsletterSubscribers
                  }

                </b>

              )
            }

          </button>


          <button
            type="button"
            className={
              section ===
              "statistics"
                ? "sidebar-active"
                : ""
            }
            onClick={() =>
              setSection(
                "statistics"
              )
            }
          >

            <span>
              ⌁
            </span>

            Statistiques

          </button>

        </aside>


        <main className="admin-main">


          {
            message && (

              <div
                className={`admin-alert floating-alert ${messageType}`}
              >

                {
                  message
                }

              </div>

            )
          }


          {
            section ===
            "products" && (

              <>

                <div className="admin-page-header">

                  <div>

                    <p className="admin-eyebrow">
                      CATALOGUE
                    </p>

                    <h1>
                      Produits
                    </h1>

                    <p>

                      Gérez les produits disponibles
                      sur votre boutique ELIO.

                    </p>

                  </div>

                </div>


                <section className="admin-stats">

                  <article>

                    <span>
                      Produits
                    </span>

                    <strong>
                      {
                        products.length
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      En ligne
                    </span>

                    <strong>
                      {
                        visibleProducts
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Stock total
                    </span>

                    <strong>
                      {
                        totalStock
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Rupture
                    </span>

                    <strong>
                      {
                        outOfStock
                      }
                    </strong>

                  </article>

                </section>


                <section className="admin-card">

                  <div className="admin-card-title">

                    <div>

                      <p className="admin-eyebrow">

                        {
                          editingProduct
                            ? "MODIFICATION"
                            : "NOUVEAU PRODUIT"
                        }

                      </p>


                      <h2>

                        {
                          editingProduct
                            ? "Modifier le produit"
                            : "Ajouter un produit"
                        }

                      </h2>

                    </div>


                    {
                      editingProduct && (

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={
                            resetForm
                          }
                        >

                          Annuler

                        </button>

                      )
                    }

                  </div>


                  <form
                    onSubmit={
                      submitProduct
                    }
                  >

                    <div className="form-grid">


                      <label>

                        Nom du produit *

                        <input
                          name="name"
                          value={
                            form.name
                          }
                          onChange={
                            handleInput
                          }
                          placeholder="Ex. Sac ELIO Sofia"
                        />

                      </label>


                      <label>

                        Catégorie *

                        <select
                          name="category"
                          value={
                            form.category
                          }
                          onChange={
                            handleInput
                          }
                        >

                          <option>
                            Sacs
                          </option>

                          <option>
                            Sacs à main
                          </option>

                          <option>
                            Mini sacs
                          </option>

                          <option>
                            Portefeuilles
                          </option>

                          <option>
                            Petite maroquinerie
                          </option>

                          <option>
                            Accessoires
                          </option>

                        </select>

                      </label>


                      <label>

                        Prix TND *

                        <input
                          name="price"
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            form.price
                          }
                          onChange={
                            handleInput
                          }
                          placeholder="189"
                        />

                      </label>


                      <label>

                        Ancien prix / prix barré

                        <input
                          name="compare_at_price"
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            form.compare_at_price
                          }
                          onChange={
                            handleInput
                          }
                          placeholder="219"
                        />

                      </label>


                      <label>

                        Stock *

                        <input
                          name="stock"
                          type="number"
                          min="0"
                          value={
                            form.stock
                          }
                          onChange={
                            handleInput
                          }
                        />

                      </label>


                      <label>

                        Référence / SKU

                        <input
                          name="sku"
                          value={
                            form.sku
                          }
                          onChange={
                            handleInput
                          }
                          placeholder="Laissez vide pour génération automatique"
                          disabled={
                            Boolean(
                              editingProduct
                            )
                          }
                        />

                      </label>


                      <label className="full-field">

                        Couleurs

                        <input
                          name="colors"
                          value={
                            form.colors
                          }
                          onChange={
                            handleInput
                          }
                          placeholder="Bordeaux, Noir, Beige"
                        />

                        <small>

                          Séparez les couleurs
                          avec des virgules.

                        </small>

                      </label>


                      <label>

                        Matière

                        <input
                          name="material"
                          value={
                            form.material
                          }
                          onChange={
                            handleInput
                          }
                          placeholder="Cuir véritable"
                        />

                      </label>


                      <label>

                        Dimensions

                        <input
                          name="dimensions"
                          value={
                            form.dimensions
                          }
                          onChange={
                            handleInput
                          }
                          placeholder="28 × 20 × 10 cm"
                        />

                      </label>


                      <label className="full-field">

                        Description

                        <textarea
                          name="description"
                          rows={
                            5
                          }
                          value={
                            form.description
                          }
                          onChange={
                            handleInput
                          }
                          placeholder="Décrivez la pièce ELIO..."
                        />

                      </label>


                      <label className="full-field">

                        Images produit

                        <div className="upload-zone">

                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={
                              handleImages
                            }
                          />


                          <div className="upload-content">

                            <strong>
                              Ajouter des images
                            </strong>

                            <span>
                              PNG, JPG ou WEBP · sans limite de nombre
                            </span>

                            <small>
                              Vous pouvez rouvrir le sélecteur plusieurs fois :
                              chaque nouvelle sélection s'ajoute aux précédentes.
                            </small>


                            {
                              selectedImages.length >
                              0 && (

                                <em>

                                  {
                                    selectedImages.length
                                  }{" "}

                                  image(s) sélectionnée(s)

                                </em>

                              )
                            }

                          </div>

                        </div>

                      </label>

                    </div>


                    <div className="product-options">

                      <label>

                        <input
                          type="checkbox"
                          name="is_new"
                          checked={
                            form.is_new
                          }
                          onChange={
                            handleCheckbox
                          }
                        />

                        <span>
                          Nouveauté
                        </span>

                      </label>


                      <label>

                        <input
                          type="checkbox"
                          name="is_featured"
                          checked={
                            form.is_featured
                          }
                          onChange={
                            handleCheckbox
                          }
                        />

                        <span>
                          Signature / mise en avant
                        </span>

                      </label>


                      <label>

                        <input
                          type="checkbox"
                          name="is_active"
                          checked={
                            form.is_active
                          }
                          onChange={
                            handleCheckbox
                          }
                        />

                        <span>
                          Visible en boutique
                        </span>

                      </label>

                    </div>


                    <button
                      className="primary-admin-button"
                      type="submit"
                      disabled={
                        saving
                      }
                    >

                      {
                        saving
                          ? "Enregistrement..."

                          : editingProduct
                            ? "Enregistrer les modifications"

                            : "Ajouter le produit"
                      }

                    </button>

                  </form>

                </section>


                <section className="admin-card">

                  <div className="products-toolbar">

                    <div>

                      <p className="admin-eyebrow">
                        CATALOGUE
                      </p>

                      <h2>
                        Tous les produits
                      </h2>

                    </div>


                    <input
                      className="product-search"
                      value={
                        search
                      }
                      onChange={
                        event =>
                          setSearch(
                            event.target.value
                          )
                      }
                      placeholder="Rechercher un produit..."
                    />

                  </div>


                  {
                    loading
                      ? (

                        <div className="admin-empty">
                          Chargement...
                        </div>

                      )

                      : filteredProducts.length ===
                        0
                        ? (

                          <div className="admin-empty">

                            <strong>
                              Aucun produit
                            </strong>

                            <p>
                              Ajoutez votre premier produit ELIO.
                            </p>

                          </div>

                        )

                        : (

                          <div className="products-admin-grid">


                            {
                              filteredProducts.map(
                                product => (

                                  <article
                                    className="admin-product-card"
                                    key={
                                      product.id
                                    }
                                  >


                                    <div className="admin-product-image">

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
                                              Aucune photo
                                            </span>

                                          )
                                      }


                                      <div className="admin-product-status">

                                        <span
                                          className={
                                            product.is_active
                                              ? "status-online"
                                              : "status-hidden"
                                          }
                                        >

                                          {
                                            product.is_active
                                              ? "En ligne"
                                              : "Masqué"
                                          }

                                        </span>

                                      </div>

                                    </div>


                                    <div className="admin-product-info">


                                      <div className="admin-product-top">

                                        <div>

                                          <span className="admin-product-category">

                                            {
                                              product.category
                                            }

                                          </span>


                                          <h3>

                                            {
                                              product.name
                                            }

                                          </h3>


                                          <small>

                                            {
                                              product.sku
                                            }

                                          </small>

                                        </div>


                                        <strong>

                                          {
                                            formatPrice(
                                              product.price
                                            )
                                          }{" "}

                                          TND

                                        </strong>

                                      </div>


                                      <div className="admin-product-meta">

                                        <span>

                                          Stock :{" "}
                                          {
                                            product.stock
                                          }

                                        </span>


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
                                        product.colors.length >
                                        0 && (

                                          <div className="color-list">

                                            {
                                              product.colors.map(
                                                color => (

                                                  <span
                                                    key={
                                                      color
                                                    }
                                                  >

                                                    {
                                                      color
                                                    }

                                                  </span>

                                                )
                                              )
                                            }

                                          </div>

                                        )
                                      }


                                      {
                                        product.images.length >
                                        0 && (

                                          <div className="admin-image-gallery">

                                            {
                                              product.images.map(
                                                image => (

                                                  <div
                                                    className="admin-thumbnail"
                                                    key={
                                                      image.id
                                                    }
                                                  >

                                                    <img
                                                      src={
                                                        imageUrl(
                                                          image.image_url
                                                        )
                                                      }
                                                      alt={
                                                        product.name
                                                      }
                                                    />


                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        void deleteImage(
                                                          product.id,
                                                          image.id
                                                        )
                                                      }
                                                      title="Supprimer l'image"
                                                    >

                                                      ×

                                                    </button>

                                                  </div>

                                                )
                                              )
                                            }

                                          </div>

                                        )
                                      }


                                      <div className="admin-product-actions">

                                        <button
                                          type="button"
                                          onClick={() =>
                                            startEditing(
                                              product
                                            )
                                          }
                                        >

                                          Modifier

                                        </button>


                                        <button
                                          type="button"
                                          className="danger-button"
                                          onClick={() =>
                                            setDeleteTarget(
                                              product
                                            )
                                          }
                                        >

                                          Supprimer

                                        </button>

                                      </div>

                                    </div>

                                  </article>

                                )
                              )
                            }

                          </div>

                        )
                  }

                </section>

              </>

            )
          }


          {
            section ===
            "orders" && (

              <>

                <div className="admin-page-header">

                  <div>

                    <p className="admin-eyebrow">
                      COMMANDES
                    </p>

                    <h1>
                      Toutes les commandes
                    </h1>

                    <p>

                      Suivez, confirmez et préparez
                      les commandes ELIO.

                    </p>

                  </div>

                </div>


                <section className="admin-stats">

                  <article>

                    <span>
                      Commandes
                    </span>

                    <strong>
                      {
                        orders.length
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Nouvelles
                    </span>

                    <strong>
                      {
                        newOrders
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      En traitement
                    </span>

                    <strong>
                      {
                        processingOrders
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Chiffre commandes
                    </span>

                    <div className="revenue-stat">

                      <strong>

                        {
                          formatPrice(
                            totalRevenue
                          )
                        }

                      </strong>

                      <small>
                        TND
                      </small>

                    </div>

                  </article>

                </section>


                <section className="admin-card">

                  <div className="orders-toolbar">

                    <div>

                      <p className="admin-eyebrow">
                        SUIVI
                      </p>

                      <h2>
                        Liste des commandes
                      </h2>

                    </div>


                    <div className="orders-toolbar-controls">

                      <input
                        value={
                          orderSearch
                        }
                        onChange={
                          event =>
                            setOrderSearch(
                              event.target.value
                            )
                        }
                        placeholder="Commande, client, téléphone..."
                      />


                      <select
                        value={
                          orderStatusFilter
                        }
                        onChange={
                          event =>
                            setOrderStatusFilter(
                              event.target.value
                            )
                        }
                      >

                        <option>
                          Tous
                        </option>


                        {
                          orderStatuses.map(
                            status => (

                              <option
                                key={
                                  status
                                }
                              >

                                {
                                  status
                                }

                              </option>

                            )
                          )
                        }

                      </select>

                    </div>

                  </div>


                  {
                    ordersLoading
                      ? (

                        <div className="admin-empty">
                          Chargement...
                        </div>

                      )

                      : filteredOrders.length ===
                        0
                        ? (

                          <div className="admin-empty">

                            <strong>
                              Aucune commande
                            </strong>

                            <p>

                              Les nouvelles commandes
                              apparaîtront ici.

                            </p>

                          </div>

                        )

                        : (

                          <div className="orders-list">

                            {
                              filteredOrders.map(
                                order => (

                                  <article
                                    className="order-card"
                                    key={
                                      order.id
                                    }
                                  >


                                    <div className="order-card-head">

                                      <div>

                                        <span className="order-date">

                                          {
                                            formatDate(
                                              order.created_at
                                            )
                                          }

                                        </span>


                                        <h3>

                                          {
                                            order.order_number
                                          }

                                        </h3>

                                      </div>


                                      <div className="order-card-head-right">

                                        <strong>

                                          {
                                            formatPrice(
                                              order.total
                                            )
                                          }{" "}

                                          TND

                                        </strong>


                                        <span
                                          className={`order-status ${statusClass(
                                            order.status
                                          )}`}
                                        >

                                          {
                                            order.status
                                          }

                                        </span>

                                      </div>

                                    </div>


                                    <div className="order-card-body">


                                      <div className="order-customer">

                                        <span className="order-label">
                                          CLIENT
                                        </span>


                                        <strong>

                                          {
                                            order.customer_name
                                          }

                                        </strong>


                                        <a
                                          href={`tel:${order.phone}`}
                                        >

                                          {
                                            order.phone
                                          }

                                        </a>


                                        {
                                          order.email && (

                                            <a
                                              href={`mailto:${order.email}`}
                                            >

                                              {
                                                order.email
                                              }

                                            </a>

                                          )
                                        }


                                        <p>

                                          {
                                            order.address
                                          }

                                          <br />

                                          {
                                            order.city
                                          }
                                          ,{" "}
                                          {
                                            order.governorate
                                          }

                                        </p>

                                      </div>


                                      <div className="order-products-preview">

                                        <span className="order-label">
                                          PRODUITS
                                        </span>


                                        {
                                          order.items
                                            .slice(
                                              0,
                                              3
                                            )
                                            .map(
                                              item => (

                                                <div
                                                  className="order-preview-item"
                                                  key={
                                                    item.id
                                                  }
                                                >

                                                  {
                                                    item.image_url
                                                      ? (

                                                        <img
                                                          src={
                                                            imageUrl(
                                                              item.image_url
                                                            )
                                                          }
                                                          alt={
                                                            item.product_name
                                                          }
                                                        />

                                                      )

                                                      : (

                                                        <div className="order-preview-placeholder">

                                                          ELIO

                                                        </div>

                                                      )
                                                  }


                                                  <div>

                                                    <strong>

                                                      {
                                                        item.product_name
                                                      }

                                                    </strong>


                                                    <span>

                                                      {
                                                        item.color ||
                                                        "Sans variante"
                                                      }

                                                    </span>


                                                    <small>

                                                      Qté{" "}
                                                      {
                                                        item.quantity
                                                      }
                                                      {" · "}

                                                      {
                                                        formatPrice(
                                                          item.line_total
                                                        )
                                                      }{" "}

                                                      TND

                                                    </small>

                                                  </div>

                                                </div>

                                              )
                                            )
                                        }


                                        {
                                          order.items.length >
                                          3 && (

                                            <small className="more-items">

                                              +{" "}
                                              {
                                                order.items.length -
                                                3
                                              }{" "}

                                              autre(s)

                                            </small>

                                          )
                                        }

                                      </div>


                                      <div className="order-management">

                                        <span className="order-label">
                                          GESTION
                                        </span>


                                        <select
                                          value={
                                            order.status
                                          }
                                          onChange={
                                            event =>
                                              void updateOrderStatus(
                                                order,
                                                event.target.value
                                              )
                                          }
                                        >

                                          {
                                            orderStatuses.map(
                                              status => (

                                                <option
                                                  key={
                                                    status
                                                  }
                                                >

                                                  {
                                                    status
                                                  }

                                                </option>

                                              )
                                            )
                                          }

                                        </select>


                                        <button
                                          type="button"
                                          className="whatsapp-order-button"
                                          onClick={() =>
                                            openWhatsApp(
                                              order
                                            )
                                          }
                                        >

                                          WhatsApp client

                                        </button>


                                        <button
                                          type="button"
                                          className="order-detail-button"
                                          onClick={() =>
                                            setSelectedOrder(
                                              order
                                            )
                                          }
                                        >

                                          Voir la commande

                                        </button>


                                        <button
                                          type="button"
                                          className="danger-button"
                                          onClick={() =>
                                            void deleteOrder(
                                              order
                                            )
                                          }
                                        >

                                          Supprimer la commande

                                        </button>

                                      </div>

                                    </div>

                                  </article>

                                )
                              )
                            }

                          </div>

                        )
                  }

                </section>

              </>

            )
          }


          {
            section ===
            "clients" && (

              <>

                <div className="admin-page-header">

                  <div>

                    <p className="admin-eyebrow">
                      RELATION CLIENT
                    </p>

                    <h1>
                      Clients
                    </h1>

                    <p>

                      Une vue consolidée des personnes
                      ayant commandé chez ELIO.

                    </p>

                  </div>

                </div>


                <section className="admin-stats">

                  <article>

                    <span>
                      Clients
                    </span>

                    <strong>
                      {
                        clients.length
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Clients fidèles
                    </span>

                    <strong>
                      {
                        repeatClients
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Commandes actives
                    </span>

                    <strong>
                      {
                        activeOrders.length
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Valeur moyenne client
                    </span>

                    <div className="revenue-stat">

                      <strong>

                        {
                          formatPrice(
                            averageClientValue
                          )
                        }

                      </strong>

                      <small>
                        TND
                      </small>

                    </div>

                  </article>

                </section>


                <section className="admin-card">

                  <div className="clients-toolbar">

                    <div>

                      <p className="admin-eyebrow">
                        BASE CLIENT
                      </p>

                      <h2>
                        Tous les clients
                      </h2>

                    </div>


                    <input
                      value={
                        clientSearch
                      }
                      onChange={
                        event =>
                          setClientSearch(
                            event.target.value
                          )
                      }
                      placeholder="Nom, téléphone, ville..."
                    />

                  </div>


                  {
                    ordersLoading
                      ? (

                        <div className="admin-empty">
                          Chargement des clients...
                        </div>

                      )

                      : filteredClients.length ===
                        0
                        ? (

                          <div className="admin-empty">

                            <strong>
                              Aucun client
                            </strong>

                            <p>

                              Les clients apparaissent
                              automatiquement à partir
                              des commandes.

                            </p>

                          </div>

                        )

                        : (

                          <div className="clients-list">

                            {
                              filteredClients.map(
                                client => (

                                  <article
                                    className="client-card"
                                    key={
                                      client.key
                                    }
                                  >


                                    <div className="client-identity">

                                      <span className="client-avatar">

                                        {
                                          client.name
                                            .trim()
                                            .charAt(
                                              0
                                            )
                                            .toUpperCase() ||
                                          "E"
                                        }

                                      </span>


                                      <div>

                                        <span className="order-label">
                                          CLIENT
                                        </span>


                                        <h3>

                                          {
                                            client.name
                                          }

                                        </h3>


                                        <a
                                          href={`tel:${client.phone}`}
                                        >

                                          {
                                            client.phone
                                          }

                                        </a>


                                        {
                                          client.email && (

                                            <a
                                              href={`mailto:${client.email}`}
                                            >

                                              {
                                                client.email
                                              }

                                            </a>

                                          )
                                        }

                                      </div>

                                    </div>


                                    <div className="client-location">

                                      <span className="order-label">
                                        ADRESSE
                                      </span>


                                      <p>

                                        {
                                          client.address
                                        }

                                        <br />

                                        {
                                          client.city
                                        }
                                        ,{" "}
                                        {
                                          client.governorate
                                        }

                                      </p>

                                    </div>


                                    <div className="client-metrics">

                                      <div>

                                        <span>
                                          Commandes
                                        </span>

                                        <strong>
                                          {
                                            client.ordersCount
                                          }
                                        </strong>

                                      </div>


                                      <div>

                                        <span>
                                          Total actif
                                        </span>

                                        <strong>

                                          {
                                            formatPrice(
                                              client.totalSpent
                                            )
                                          }{" "}

                                          TND

                                        </strong>

                                      </div>


                                      <div>

                                        <span>
                                          Dernière commande
                                        </span>

                                        <strong>

                                          {
                                            formatDate(
                                              client.lastOrderAt
                                            )
                                          }

                                        </strong>

                                      </div>

                                    </div>


                                    <div className="client-actions">

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openWhatsApp(
                                            client.lastOrder
                                          )
                                        }
                                      >

                                        WhatsApp

                                      </button>


                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedOrder(
                                            client.lastOrder
                                          )
                                        }
                                      >

                                        Dernière commande

                                      </button>

                                    </div>

                                  </article>

                                )
                              )
                            }

                          </div>

                        )
                  }

                </section>

              </>

            )
          }


          {
            section ===
            "newsletter" && (

              <>

                <div className="admin-page-header">

                  <div>

                    <p className="admin-eyebrow">
                      MARKETING
                    </p>

                    <h1>
                      Newsletter
                    </h1>

                    <p>

                      Consultez les inscriptions
                      à la newsletter ELIO et
                      gérez votre liste d'abonnés.

                    </p>

                  </div>

                </div>


                <section className="admin-stats">

                  <article>

                    <span>
                      Abonnés
                    </span>

                    <strong>
                      {
                        newsletterSubscribers.length
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Actifs
                    </span>

                    <strong>
                      {
                        activeNewsletterSubscribers
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Désinscrits
                    </span>

                    <strong>
                      {
                        inactiveNewsletterSubscribers
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      30 derniers jours
                    </span>

                    <strong>
                      {
                        newsletterLast30Days
                      }
                    </strong>

                  </article>

                </section>


                <section className="admin-card">

                  <div className="clients-toolbar">

                    <div>

                      <p className="admin-eyebrow">
                        LISTE NEWSLETTER
                      </p>

                      <h2>
                        Tous les abonnés
                      </h2>

                    </div>


                    <input
                      value={
                        newsletterSearch
                      }
                      onChange={
                        event =>
                          setNewsletterSearch(
                            event.target.value
                          )
                      }
                      placeholder="Rechercher une adresse e-mail..."
                    />

                  </div>


                  {
                    newsletterLoading
                      ? (

                        <div className="admin-empty">
                          Chargement des abonnés...
                        </div>

                      )

                      : filteredNewsletterSubscribers.length ===
                        0
                        ? (

                          <div className="admin-empty">

                            <strong>
                              Aucun abonné
                            </strong>

                            <p>

                              Les inscriptions effectuées
                              depuis le pied de page
                              apparaîtront ici.

                            </p>

                          </div>

                        )

                        : (

                          <div className="clients-list">

                            {
                              filteredNewsletterSubscribers.map(
                                subscriber => (

                                  <article
                                    className="client-card"
                                    key={
                                      subscriber.id
                                    }
                                  >


                                    <div className="client-identity">

                                      <span className="client-avatar">
                                        @
                                      </span>


                                      <div>

                                        <span className="order-label">
                                          ABONNÉ
                                        </span>

                                        <h3>
                                          {
                                            subscriber.email
                                          }
                                        </h3>

                                        <span
                                          className={
                                            subscriber.is_active
                                              ? "status-online"
                                              : "status-hidden"
                                          }
                                        >

                                          {
                                            subscriber.is_active
                                              ? "Actif"
                                              : "Désinscrit"
                                          }

                                        </span>

                                      </div>

                                    </div>


                                    <div className="client-location">

                                      <span className="order-label">
                                        INSCRIPTION
                                      </span>

                                      <p>

                                        {
                                          formatDate(
                                            subscriber.subscribed_at
                                          )
                                        }

                                        {
                                          subscriber.unsubscribed_at && (
                                            <>

                                              <br />

                                              Désinscrit :{" "}

                                              {
                                                formatDate(
                                                  subscriber.unsubscribed_at
                                                )
                                              }

                                            </>
                                          )
                                        }

                                      </p>

                                    </div>


                                    <div className="client-metrics">

                                      <div>

                                        <span>
                                          Statut
                                        </span>

                                        <strong>

                                          {
                                            subscriber.is_active
                                              ? "Actif"
                                              : "Inactif"
                                          }

                                        </strong>

                                      </div>


                                      <div>

                                        <span>
                                          Source
                                        </span>

                                        <strong>
                                          {
                                            subscriber.source ||
                                            "footer"
                                          }
                                        </strong>

                                      </div>


                                      <div>

                                        <span>
                                          Mise à jour
                                        </span>

                                        <strong>
                                          {
                                            formatDate(
                                              subscriber.updated_at
                                            )
                                          }
                                        </strong>

                                      </div>

                                    </div>


                                    <div className="client-actions">

                                      <button
                                        type="button"
                                        onClick={() =>
                                          void copyNewsletterEmail(
                                            subscriber.email
                                          )
                                        }
                                      >

                                        Copier

                                      </button>


                                      <button
                                        type="button"
                                        onClick={() => {

                                          window.location.href =
                                            `mailto:${subscriber.email}`;

                                        }}
                                      >

                                        E-mail

                                      </button>


                                      <button
                                        type="button"
                                        className="danger-button"
                                        onClick={() =>
                                          void deleteNewsletterSubscriber(
                                            subscriber
                                          )
                                        }
                                      >

                                        Supprimer

                                      </button>

                                    </div>

                                  </article>

                                )
                              )
                            }

                          </div>

                        )
                  }

                </section>

              </>

            )
          }


          {
            section ===
            "statistics" && (

              <>

                <div className="admin-page-header">

                  <div>

                    <p className="admin-eyebrow">
                      PILOTAGE
                    </p>

                    <h1>
                      Statistiques
                    </h1>

                    <p>

                      Une vue claire des ventes,
                      clients, produits et commandes ELIO.

                    </p>

                  </div>

                </div>


                <section className="admin-stats statistics-main-stats">

                  <article>

                    <span>
                      Chiffre commandes
                    </span>

                    <div className="revenue-stat">

                      <strong>

                        {
                          formatPrice(
                            totalRevenue
                          )
                        }

                      </strong>

                      <small>
                        TND
                      </small>

                    </div>

                  </article>


                  <article>

                    <span>
                      Panier moyen
                    </span>

                    <div className="revenue-stat">

                      <strong>

                        {
                          formatPrice(
                            averageOrder
                          )
                        }

                      </strong>

                      <small>
                        TND
                      </small>

                    </div>

                  </article>


                  <article>

                    <span>
                      Clients
                    </span>

                    <strong>
                      {
                        clients.length
                      }
                    </strong>

                  </article>


                  <article>

                    <span>
                      Pièces vendues
                    </span>

                    <strong>
                      {
                        itemsSold
                      }
                    </strong>

                  </article>

                </section>


                <div className="statistics-grid">


                  <section className="admin-card statistics-panel">

                    <div className="statistics-panel-heading">

                      <div>

                        <p className="admin-eyebrow">
                          VENTES
                        </p>

                        <h2>
                          Performance
                        </h2>

                      </div>

                    </div>


                    <div className="statistics-kpis">

                      <article>

                        <span>
                          Commandes actives
                        </span>

                        <strong>
                          {
                            activeOrders.length
                          }
                        </strong>

                      </article>


                      <article>

                        <span>
                          Livrées
                        </span>

                        <strong>
                          {
                            deliveredOrders
                          }
                        </strong>

                      </article>


                      <article>

                        <span>
                          En traitement
                        </span>

                        <strong>
                          {
                            processingOrders
                          }
                        </strong>

                      </article>


                      <article>

                        <span>
                          Nouvelles
                        </span>

                        <strong>
                          {
                            newOrders
                          }
                        </strong>

                      </article>

                    </div>


                    <div className="statistics-highlight">

                      <span>
                        Chiffre livré
                      </span>

                      <strong>

                        {
                          formatPrice(
                            deliveredRevenue
                          )
                        }{" "}

                        TND

                      </strong>

                      <small>

                        Commandes au statut
                        « Livrée »

                      </small>

                    </div>

                  </section>


                  <section className="admin-card statistics-panel">

                    <div className="statistics-panel-heading">

                      <div>

                        <p className="admin-eyebrow">
                          STATUTS
                        </p>

                        <h2>
                          Commandes
                        </h2>

                      </div>

                    </div>


                    <div className="status-chart">

                      {
                        statusStats.map(
                          item => (

                            <div
                              className="status-chart-row"
                              key={
                                item.status
                              }
                            >

                              <div>

                                <span>
                                  {
                                    item.status
                                  }
                                </span>

                                <strong>
                                  {
                                    item.count
                                  }
                                </strong>

                              </div>


                              <div className="status-track">

                                <span
                                  style={{
                                    width:
                                      `${(
                                        item.count /
                                        maxStatusCount
                                      ) *
                                      100}%`,
                                  }}
                                />

                              </div>

                            </div>

                          )
                        )
                      }

                    </div>

                  </section>


                  <section className="admin-card statistics-panel">

                    <div className="statistics-panel-heading">

                      <div>

                        <p className="admin-eyebrow">
                          PRODUITS
                        </p>

                        <h2>
                          Meilleures ventes
                        </h2>

                      </div>

                    </div>


                    {
                      topProducts.length ===
                      0
                        ? (

                          <div className="statistics-empty">
                            Pas encore de ventes.
                          </div>

                        )

                        : (

                          <div className="ranking-list">

                            {
                              topProducts.map(
                                (
                                  item,
                                  index
                                ) => (

                                  <article
                                    key={
                                      item.key
                                    }
                                  >

                                    <b>

                                      {
                                        String(
                                          index +
                                          1
                                        ).padStart(
                                          2,
                                          "0"
                                        )
                                      }

                                    </b>


                                    <div>

                                      <strong>
                                        {
                                          item.label
                                        }
                                      </strong>

                                      <span>

                                        {
                                          item.secondary ||
                                          "Produit ELIO"
                                        }

                                      </span>

                                    </div>


                                    <div className="ranking-values">

                                      <strong>

                                        {
                                          item.quantity
                                        }{" "}

                                        pièce(s)

                                      </strong>


                                      <span>

                                        {
                                          formatPrice(
                                            item.revenue
                                          )
                                        }{" "}

                                        TND

                                      </span>

                                    </div>

                                  </article>

                                )
                              )
                            }

                          </div>

                        )
                    }

                  </section>


                  <section className="admin-card statistics-panel">

                    <div className="statistics-panel-heading">

                      <div>

                        <p className="admin-eyebrow">
                          CLIENTS
                        </p>

                        <h2>
                          Meilleurs clients
                        </h2>

                      </div>

                    </div>


                    {
                      topClients.length ===
                      0
                        ? (

                          <div className="statistics-empty">
                            Pas encore de clients.
                          </div>

                        )

                        : (

                          <div className="ranking-list">

                            {
                              topClients.map(
                                (
                                  client,
                                  index
                                ) => (

                                  <article
                                    key={
                                      client.key
                                    }
                                  >

                                    <b>

                                      {
                                        String(
                                          index +
                                          1
                                        ).padStart(
                                          2,
                                          "0"
                                        )
                                      }

                                    </b>


                                    <div>

                                      <strong>
                                        {
                                          client.name
                                        }
                                      </strong>

                                      <span>
                                        {
                                          client.phone
                                        }
                                      </span>

                                    </div>


                                    <div className="ranking-values">

                                      <strong>

                                        {
                                          formatPrice(
                                            client.totalSpent
                                          )
                                        }{" "}

                                        TND

                                      </strong>


                                      <span>

                                        {
                                          client.ordersCount
                                        }{" "}

                                        commande(s)

                                      </span>

                                    </div>

                                  </article>

                                )
                              )
                            }

                          </div>

                        )
                    }

                  </section>


                  <section className="admin-card statistics-panel statistics-panel-wide">

                    <div className="statistics-panel-heading">

                      <div>

                        <p className="admin-eyebrow">
                          GÉOGRAPHIE
                        </p>

                        <h2>
                          Commandes par gouvernorat
                        </h2>

                      </div>

                    </div>


                    {
                      governorateStats.length ===
                      0
                        ? (

                          <div className="statistics-empty">

                            Aucune donnée géographique.

                          </div>

                        )

                        : (

                          <div className="governorate-grid">

                            {
                              governorateStats.map(
                                item => (

                                  <article
                                    key={
                                      item.key
                                    }
                                  >

                                    <span>
                                      {
                                        item.label
                                      }
                                    </span>


                                    <strong>

                                      {
                                        item.quantity
                                      }{" "}

                                      commande(s)

                                    </strong>


                                    <small>

                                      {
                                        formatPrice(
                                          item.revenue
                                        )
                                      }{" "}

                                      TND

                                    </small>

                                  </article>

                                )
                              )
                            }

                          </div>

                        )
                    }

                  </section>


                  <section className="admin-card statistics-panel statistics-panel-wide">

                    <div className="statistics-panel-heading">

                      <div>

                        <p className="admin-eyebrow">
                          CATALOGUE
                        </p>

                        <h2>
                          Santé du stock
                        </h2>

                      </div>

                    </div>


                    <div className="catalogue-health">

                      <article>

                        <span>
                          Produits
                        </span>

                        <strong>
                          {
                            products.length
                          }
                        </strong>

                      </article>


                      <article>

                        <span>
                          En ligne
                        </span>

                        <strong>
                          {
                            visibleProducts
                          }
                        </strong>

                      </article>


                      <article>

                        <span>
                          Stock total
                        </span>

                        <strong>
                          {
                            totalStock
                          }
                        </strong>

                      </article>


                      <article>

                        <span>
                          Rupture
                        </span>

                        <strong>
                          {
                            outOfStock
                          }
                        </strong>

                      </article>

                    </div>

                  </section>

                </div>

              </>

            )
          }

        </main>

      </div>


      {
        deleteTarget && (

          <div className="admin-modal-backdrop">

            <div className="admin-modal">

              <p className="admin-eyebrow">
                SUPPRESSION
              </p>


              <h2>
                Supprimer le produit ?
              </h2>


              <p>

                Vous êtes sur le point
                de supprimer{" "}

                <strong>
                  {
                    deleteTarget.name
                  }
                </strong>
                .

              </p>


              <div className="modal-actions">

                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(
                      null
                    )
                  }
                >

                  Annuler

                </button>


                <button
                  type="button"
                  className="modal-delete"
                  onClick={() =>
                    void deleteProduct()
                  }
                >

                  Supprimer définitivement

                </button>

              </div>

            </div>

          </div>

        )
      }


      {
        selectedOrder && (

          <div className="admin-modal-backdrop order-modal-backdrop">

            <div className="order-detail-modal">


              <div className="order-detail-header">

                <div>

                  <p className="admin-eyebrow">
                    COMMANDE
                  </p>


                  <h2>
                    {
                      selectedOrder.order_number
                    }
                  </h2>


                  <span>

                    {
                      formatDate(
                        selectedOrder.created_at
                      )
                    }

                  </span>

                </div>


                <button
                  type="button"
                  className="order-modal-close"
                  onClick={() =>
                    setSelectedOrder(
                      null
                    )
                  }
                >

                  ×

                </button>

              </div>


              <div className="order-detail-grid">


                <section>

                  <h3>
                    Client
                  </h3>


                  <div className="order-detail-info">

                    <strong>
                      {
                        selectedOrder.customer_name
                      }
                    </strong>


                    <a
                      href={`tel:${selectedOrder.phone}`}
                    >

                      {
                        selectedOrder.phone
                      }

                    </a>


                    {
                      selectedOrder.email && (

                        <a
                          href={`mailto:${selectedOrder.email}`}
                        >

                          {
                            selectedOrder.email
                          }

                        </a>

                      )
                    }


                    <p>

                      {
                        selectedOrder.address
                      }

                      <br />

                      {
                        selectedOrder.city
                      }

                      <br />

                      {
                        selectedOrder.governorate
                      }

                    </p>


                    {
                      selectedOrder.notes && (

                        <div className="order-note">

                          <span>
                            Note
                          </span>

                          <p>
                            {
                              selectedOrder.notes
                            }
                          </p>

                        </div>

                      )
                    }

                  </div>

                </section>


                <section>

                  <h3>
                    Gestion
                  </h3>


                  <label className="order-detail-status">

                    Statut

                    <select
                      value={
                        selectedOrder.status
                      }
                      onChange={
                        event =>
                          void updateOrderStatus(
                            selectedOrder,
                            event.target.value
                          )
                      }
                    >

                      {
                        orderStatuses.map(
                          status => (

                            <option
                              key={
                                status
                              }
                            >

                              {
                                status
                              }

                            </option>

                          )
                        )
                      }

                    </select>

                  </label>


                  <button
                    type="button"
                    className="whatsapp-detail-button"
                    onClick={() =>
                      openWhatsApp(
                        selectedOrder
                      )
                    }
                  >

                    Contacter sur WhatsApp

                  </button>


                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      void deleteOrder(
                        selectedOrder
                      )
                    }
                  >

                    Supprimer la commande

                  </button>

                </section>

              </div>


              <div className="order-detail-products">

                <h3>
                  Produits commandés
                </h3>


                {
                  selectedOrder.items.map(
                    item => (

                      <article
                        className="order-detail-product"
                        key={
                          item.id
                        }
                      >


                        <div className="order-detail-product-image">

                          {
                            item.image_url
                              ? (

                                <img
                                  src={
                                    imageUrl(
                                      item.image_url
                                    )
                                  }
                                  alt={
                                    item.product_name
                                  }
                                />

                              )

                              : (

                                <span>
                                  ELIO
                                </span>

                              )
                          }

                        </div>


                        <div>

                          <span>
                            {
                              item.sku
                            }
                          </span>


                          <strong>
                            {
                              item.product_name
                            }
                          </strong>


                          {
                            item.color && (

                              <p>

                                Couleur :{" "}
                                {
                                  item.color
                                }

                              </p>

                            )
                          }

                        </div>


                        <div className="order-detail-quantity">

                          <span>
                            Quantité
                          </span>

                          <strong>
                            {
                              item.quantity
                            }
                          </strong>

                        </div>


                        <div className="order-detail-price">

                          <span>
                            Total
                          </span>

                          <strong>

                            {
                              formatPrice(
                                item.line_total
                              )
                            }{" "}

                            TND

                          </strong>

                        </div>

                      </article>

                    )
                  )
                }

              </div>


              <div className="order-detail-totals">

                <div>

                  <span>
                    Sous-total
                  </span>

                  <strong>

                    {
                      formatPrice(
                        selectedOrder.subtotal
                      )
                    }{" "}

                    TND

                  </strong>

                </div>


                <div>

                  <span>
                    Livraison
                  </span>

                  <strong>

                    {
                      formatPrice(
                        selectedOrder.delivery_fee
                      )
                    }{" "}

                    TND

                  </strong>

                </div>


                <div className="order-detail-grand-total">

                  <span>
                    Total
                  </span>

                  <strong>

                    {
                      formatPrice(
                        selectedOrder.total
                      )
                    }{" "}

                    TND

                  </strong>

                </div>

              </div>

            </div>

          </div>

        )
      }

    </div>

  );

}


export default AdminPage;