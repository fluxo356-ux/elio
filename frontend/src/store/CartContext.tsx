import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";


const STORAGE_KEY =
  "elio-cart";


export type StoredCartItem = {
  product_id: number;
  color: string;
  quantity: number;
};


export type CartStockProduct = {
  id: number;
  stock: number;
  colors: string[];
};


type CartContextValue = {
  cart: StoredCartItem[];
  cartCount: number;

  addItem: (
    productId: number,
    color: string,
    quantity: number,
    maxStock: number
  ) => void;

  changeItemQuantity: (
    productId: number,
    color: string,
    change: number,
    maxStock: number
  ) => void;

  removeItem: (
    productId: number,
    color: string
  ) => void;

  reconcileCart: (
    products:
      CartStockProduct[]
  ) => void;

  clearCart: () => void;
};


const CartContext =
  createContext<
    CartContextValue |
    undefined
  >(undefined);


/* ========================================================= */
/* CART NORMALIZATION */
/* ========================================================= */

const normalizeCart = (
  value: unknown
): StoredCartItem[] => {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }


  const merged =
    new Map<
      string,
      StoredCartItem
    >();


  value.forEach(
    rawItem => {

      if (
        !rawItem ||
        typeof rawItem !==
          "object"
      ) {

        return;

      }


      const candidate =
        rawItem as
          Partial<
            StoredCartItem
          >;


      const productId =
        Number(
          candidate.product_id
        );


      const quantity =
        Math.trunc(
          Number(
            candidate.quantity
          )
        );


      const color =
        typeof candidate.color ===
        "string"
          ? candidate.color
          : "";


      if (
        !Number.isInteger(
          productId
        ) ||
        productId <= 0 ||
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {

        return;

      }


      const key =
        `${productId}::${color}`;


      const existing =
        merged.get(
          key
        );


      if (
        existing
      ) {

        existing.quantity +=
          quantity;

      } else {

        merged.set(
          key,
          {
            product_id:
              productId,

            color,

            quantity,
          }
        );

      }

    }
  );


  return Array.from(
    merged.values()
  );

};


/* ========================================================= */
/* PROVIDER */
/* ========================================================= */

export function CartProvider(
  {
    children,
  }: {
    children: ReactNode;
  }
) {

  const [
    cart,
    setCart,
  ] = useState<
    StoredCartItem[]
  >(() => {

    try {

      const stored =
        window.localStorage.getItem(
          STORAGE_KEY
        );


      if (!stored) {

        return [];

      }


      return normalizeCart(
        JSON.parse(
          stored
        )
      );

    } catch {

      return [];

    }

  });


  /* ======================================================= */
  /* PERSIST CART */
  /* ======================================================= */

  useEffect(() => {

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        cart
      )
    );

  }, [cart]);


  /* ======================================================= */
  /* KEEP OTHER TABS IN SYNC */
  /* ======================================================= */

  useEffect(() => {

    const handleStorage = (
      event:
        StorageEvent
    ) => {

      if (
        event.key !==
        STORAGE_KEY
      ) {

        return;

      }


      if (
        !event.newValue
      ) {

        setCart([]);

        return;

      }


      try {

        setCart(
          normalizeCart(
            JSON.parse(
              event.newValue
            )
          )
        );

      } catch {

        setCart([]);

      }

    };


    window.addEventListener(
      "storage",
      handleStorage
    );


    return () => {

      window.removeEventListener(
        "storage",
        handleStorage
      );

    };

  }, []);


  /* ======================================================= */
  /* CART COUNT */
  /* ======================================================= */

  const cartCount =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item
          ) =>
            total +
            item.quantity,
          0
        ),
      [cart]
    );


  /* ======================================================= */
  /* ADD ITEM */
  /* ======================================================= */

  const addItem = (
    productId: number,
    color: string,
    quantity: number,
    maxStock: number
  ) => {

    const safeQuantity =
      Math.max(
        0,
        Math.trunc(
          quantity
        )
      );


    const safeStock =
      Math.max(
        0,
        Math.trunc(
          maxStock
        )
      );


    if (
      productId <= 0 ||
      safeQuantity <= 0 ||
      safeStock <= 0
    ) {

      return;

    }


    setCart(
      previous => {

        const productQuantity =
          previous.reduce(
            (
              total,
              item
            ) =>
              item.product_id ===
              productId
                ? total +
                  item.quantity
                : total,
            0
          );


        const remainingStock =
          Math.max(
            0,
            safeStock -
            productQuantity
          );


        const quantityToAdd =
          Math.min(
            safeQuantity,
            remainingStock
          );


        if (
          quantityToAdd <= 0
        ) {

          return previous;

        }


        const existingIndex =
          previous.findIndex(
            item =>
              item.product_id ===
                productId &&
              item.color ===
                color
          );


        if (
          existingIndex >= 0
        ) {

          return previous.map(
            (
              item,
              index
            ) =>
              index ===
              existingIndex
                ? {
                    ...item,

                    quantity:
                      item.quantity +
                      quantityToAdd,
                  }
                : item
          );

        }


        return [
          ...previous,

          {
            product_id:
              productId,

            color,

            quantity:
              quantityToAdd,
          },
        ];

      }
    );

  };


  /* ======================================================= */
  /* CHANGE QUANTITY */
  /* ======================================================= */

  const changeItemQuantity = (
    productId: number,
    color: string,
    change: number,
    maxStock: number
  ) => {

    const safeChange =
      Math.trunc(
        change
      );


    const safeStock =
      Math.max(
        0,
        Math.trunc(
          maxStock
        )
      );


    if (
      safeChange === 0
    ) {

      return;

    }


    setCart(
      previous => {

        const index =
          previous.findIndex(
            item =>
              item.product_id ===
                productId &&
              item.color ===
                color
          );


        if (
          index < 0
        ) {

          return previous;

        }


        const currentItem =
          previous[index];


        if (
          safeChange < 0
        ) {

          const nextQuantity =
            currentItem.quantity +
            safeChange;


          if (
            nextQuantity <= 0
          ) {

            return previous.filter(
              (
                _,
                itemIndex
              ) =>
                itemIndex !==
                index
            );

          }


          return previous.map(
            (
              item,
              itemIndex
            ) =>
              itemIndex ===
              index
                ? {
                    ...item,

                    quantity:
                      nextQuantity,
                  }
                : item
          );

        }


        const productQuantity =
          previous.reduce(
            (
              total,
              item
            ) =>
              item.product_id ===
              productId
                ? total +
                  item.quantity
                : total,
            0
          );


        const remainingStock =
          Math.max(
            0,
            safeStock -
            productQuantity
          );


        const increase =
          Math.min(
            safeChange,
            remainingStock
          );


        if (
          increase <= 0
        ) {

          return previous;

        }


        return previous.map(
          (
            item,
            itemIndex
          ) =>
            itemIndex ===
            index
              ? {
                  ...item,

                  quantity:
                    item.quantity +
                    increase,
                }
              : item
        );

      }
    );

  };


  /* ======================================================= */
  /* REMOVE ITEM */
  /* ======================================================= */

  const removeItem = (
    productId: number,
    color: string
  ) => {

    setCart(
      previous =>
        previous.filter(
          item =>
            !(
              item.product_id ===
                productId &&
              item.color ===
                color
            )
        )
    );

  };


  /* ======================================================= */
  /* RECONCILE CART WITH CURRENT CATALOG */
  /* ======================================================= */

  const reconcileCart = (
    products:
      CartStockProduct[]
  ) => {

    const productMap =
      new Map(
        products.map(
          product => [
            product.id,
            product,
          ]
        )
      );


    setCart(
      previous => {

        const usedStock =
          new Map<
            number,
            number
          >();


        const nextCart:
          StoredCartItem[] =
          [];


        previous.forEach(
          item => {

            const product =
              productMap.get(
                item.product_id
              );


            if (
              !product ||
              product.stock <= 0
            ) {

              return;

            }


            if (
              product.colors.length >
                0 &&
              !product.colors.includes(
                item.color
              )
            ) {

              return;

            }


            const alreadyUsed =
              usedStock.get(
                product.id
              ) || 0;


            const remaining =
              Math.max(
                0,
                product.stock -
                alreadyUsed
              );


            if (
              remaining <= 0
            ) {

              return;

            }


            const quantity =
              Math.min(
                item.quantity,
                remaining
              );


            if (
              quantity <= 0
            ) {

              return;

            }


            nextCart.push({
              ...item,
              quantity,
            });


            usedStock.set(
              product.id,
              alreadyUsed +
              quantity
            );

          }
        );


        return normalizeCart(
          nextCart
        );

      }
    );

  };


  /* ======================================================= */
  /* CLEAR CART */
  /* ======================================================= */

  const clearCart =
    () => {

      setCart([]);

    };


  const value:
    CartContextValue = {
      cart,
      cartCount,
      addItem,
      changeItemQuantity,
      removeItem,
      reconcileCart,
      clearCart,
    };


  return (

    <CartContext.Provider
      value={
        value
      }
    >
      {
        children
      }
    </CartContext.Provider>

  );

}


/* ========================================================= */
/* HOOK */
/* ========================================================= */

export function useCart() {

  const context =
    useContext(
      CartContext
    );


  if (!context) {

    throw new Error(
      "useCart must be used inside CartProvider."
    );

  }


  return context;

}
