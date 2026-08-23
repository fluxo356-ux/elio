from __future__ import annotations

import json
import os
import re
import secrets
import psycopg
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation
import uuid

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
)

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = (
    os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)
SUPABASE_STORAGE_BUCKET = os.getenv(
    "SUPABASE_STORAGE_BUCKET",
    "product-images",
)

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing from backend/.env")
if not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is missing from backend/.env"
    )

from supabase import create_client

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
)

SUPABASE_PUBLIC_STORAGE_BASE = (
    f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/"
    f"{SUPABASE_STORAGE_BUCKET}"
)

ADMIN_KEY = os.getenv(
    "ADMIN_KEY",
    "elio-local-admin-2026",
)

DELIVERY_FEE = 8.0

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_IMAGE_SIZE = 8 * 1024 * 1024

ORDER_STATUSES = {
    "Nouvelle",
    "À confirmer",
    "Confirmée",
    "En préparation",
    "Expédiée",
    "Livrée",
    "Annulée",
}

NEWSLETTER_EMAIL_PATTERN = re.compile(
    r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
)


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="ELIO Maroquinerie API",
    version="1.1.0",
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# ============================================================
# DATABASE
# ============================================================

# Supabase/PostgreSQL stores is_active, is_deleted, is_new, and
# is_featured as BOOLEAN values. Always send/query TRUE/FALSE or
# Python bool values; never use SQLite-style 1/0 for these columns.

def get_database():
    # Supabase's shared pooler is commonly used for IPv4-only local machines.
    # prepare_threshold=None also keeps this compatible with transaction pooling.
    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row,
        connect_timeout=10,
        prepare_threshold=None,
    )


# ============================================================
# PYDANTIC MODELS
# ============================================================

class ProductUpdate(
    BaseModel
):

    name: Optional[str] = None

    category: Optional[str] = None

    price: Optional[float] = None

    compare_at_price: Optional[
        float
    ] = None

    description: Optional[
        str
    ] = None

    material: Optional[
        str
    ] = None

    dimensions: Optional[
        str
    ] = None

    colors: Optional[
        list[str]
    ] = None

    stock: Optional[
        int
    ] = None

    is_new: Optional[
        bool
    ] = None

    is_featured: Optional[
        bool
    ] = None

    is_active: Optional[
        bool
    ] = None


class OrderItemCreate(
    BaseModel
):

    product_id: int

    color: str = ""

    quantity: int = Field(
        ge=1,
        le=100,
    )


class OrderCreate(
    BaseModel
):

    customer_name: str = Field(
        min_length=2,
        max_length=120,
    )

    phone: str = Field(
        min_length=8,
        max_length=30,
    )

    email: Optional[str] = Field(
        default=None,
        max_length=180,
    )

    governorate: str = Field(
        min_length=2,
        max_length=100,
    )

    city: str = Field(
        min_length=2,
        max_length=100,
    )

    address: str = Field(
        min_length=4,
        max_length=300,
    )

    notes: str = Field(
        default="",
        max_length=700,
    )

    items: list[
        OrderItemCreate
    ]


class OrderStatusUpdate(
    BaseModel
):

    status: str


class NewsletterSubscribeRequest(
    BaseModel
):

    email: str = Field(
        min_length=5,
        max_length=180,
    )


class NewsletterUnsubscribeRequest(
    BaseModel
):

    token: str = Field(
        min_length=10,
        max_length=200,
    )


# ============================================================
# GENERAL HELPERS
# ============================================================

def current_time() -> str:

    return datetime.now(
        timezone.utc
    ).isoformat()


def create_slug(
    text: str,
) -> str:

    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        text.strip().lower(),
    ).strip("-")

    return (
        slug
        or "produit"
    )


def unique_slug(
    connection: object,
    name: str,
) -> str:

    base_slug = create_slug(
        name
    )

    slug = base_slug

    number = 2


    while connection.execute(
        """
        SELECT id

        FROM products

        WHERE slug = %s
        """,
        (
            slug,
        ),
    ).fetchone():

        slug = (
            f"{base_slug}-{number}"
        )

        number += 1


    return slug


def generate_sku() -> str:

    return (
        f"ELIO-"
        f"{uuid.uuid4().hex[:8].upper()}"
    )


def generate_order_number(
    connection: object,
) -> str:

    today = (
        datetime.now()
        .strftime(
            "%Y%m%d"
        )
    )


    prefix = (
        f"ELIO-{today}-"
    )


    row = connection.execute(
        """
        SELECT order_number

        FROM orders

        WHERE order_number LIKE %s

        ORDER BY id DESC

        LIMIT 1
        """,
        (
            f"{prefix}%",
        ),
    ).fetchone()


    if not row:

        number = 1

    else:

        try:

            number = (
                int(
                    row[
                        "order_number"
                    ].split("-")[-1]
                )
                + 1
            )

        except Exception:

            number = 1


    return (
        f"{prefix}"
        f"{number:04d}"
    )


def parse_colors(
    colors: str,
) -> list[str]:

    return [

        color.strip()

        for color
        in colors.split(",")

        if color.strip()

    ]


def normalize_newsletter_email(
    email: str,
) -> str:

    normalized = (
        email
        .strip()
        .lower()
    )


    if (
        len(normalized) > 180
        or
        not NEWSLETTER_EMAIL_PATTERN.fullmatch(
            normalized
        )
    ):

        raise HTTPException(
            status_code=400,

            detail=(
                "Adresse e-mail invalide."
            ),
        )


    return normalized


# ============================================================
# ADMIN SECURITY
# ============================================================

def check_admin_key(
    x_admin_key: Optional[str],
) -> None:

    if not x_admin_key:

        raise HTTPException(
            status_code=401,

            detail=(
                "Admin authentication required."
            ),
        )


    if not secrets.compare_digest(
        x_admin_key,
        ADMIN_KEY,
    ):

        raise HTTPException(
            status_code=401,

            detail=(
                "Invalid admin key."
            ),
        )


# ============================================================
# PRODUCT HELPERS
# ============================================================

def get_main_image(
    connection: object,
    product_id: int,
) -> Optional[str]:

    image = connection.execute(
        """
        SELECT image_url

        FROM product_images

        WHERE product_id = %s

        ORDER BY
            position ASC,
            id ASC

        LIMIT 1
        """,
        (
            product_id,
        ),
    ).fetchone()


    if not image:

        return None


    return normalize_image_url(
        image["image_url"],
        product_id,
    )


def serialize_product(
    connection: object,
    row: dict,
) -> dict:

    product = dict(
        row
    )


    try:
        raw_colors = product.get("colors", [])
        if isinstance(raw_colors, str):
            product["colors"] = json.loads(raw_colors)
        elif raw_colors is None:
            product["colors"] = []
        else:
            product["colors"] = list(raw_colors)
    except Exception:
        product["colors"] = []


    product[
        "is_new"
    ] = bool(
        product[
            "is_new"
        ]
    )


    product[
        "is_featured"
    ] = bool(
        product[
            "is_featured"
        ]
    )


    product[
        "is_active"
    ] = bool(
        product[
            "is_active"
        ]
    )


    if (
        "is_deleted"
        in product
    ):

        product[
            "is_deleted"
        ] = bool(
            product[
                "is_deleted"
            ]
        )


    images = connection.execute(
        """
        SELECT
            id,
            image_url,
            position

        FROM product_images

        WHERE product_id = %s

        ORDER BY
            position ASC,
            id ASC
        """,
        (
            product[
                "id"
            ],
        ),
    ).fetchall()


    product[
        "images"
    ] = [
        {
            **dict(image),
            "image_url": normalize_image_url(
                image["image_url"],
                product["id"],
            ),
        }
        for image in images
    ]


    product[
        "main_image"
    ] = (

        images[0][
            "image_url"
        ]

        if images

        else None

    )


    return product


# ============================================================
# IMAGE HELPERS — SUPABASE STORAGE
# ============================================================

def public_storage_url(storage_path: str) -> str:
    return (
        f"{SUPABASE_PUBLIC_STORAGE_BASE.rstrip('/')}/"
        f"{storage_path.lstrip('/')}"
    )


def normalize_image_url(
    image_url: Optional[str],
    product_id: Optional[int] = None,
) -> Optional[str]:
    if not image_url:
        return None

    value = str(image_url).strip()
    if not value:
        return None

    if value.startswith("http://") or value.startswith("https://"):
        return value

    # New records may store a Storage object path directly.
    if value.startswith("products/"):
        return public_storage_url(value)

    # Compatibility for the old local database format: /uploads/file.jpg.
    if value.startswith("/uploads/") and product_id is not None:
        filename = value.removeprefix("/uploads/")
        return public_storage_url(
            f"products/{product_id}/{filename}"
        )

    if value.startswith("/storage/v1/object/public/"):
        return f"{SUPABASE_URL.rstrip('/')}{value}"

    return value


def storage_path_from_url(
    image_url: Optional[str],
    product_id: Optional[int] = None,
) -> Optional[str]:
    if not image_url:
        return None

    value = str(image_url).strip()
    marker = f"/storage/v1/object/public/{SUPABASE_STORAGE_BUCKET}/"

    if marker in value:
        return value.split(marker, 1)[1].split("?", 1)[0]

    if value.startswith("products/"):
        return value.split("?", 1)[0]

    if value.startswith("/uploads/") and product_id is not None:
        filename = value.removeprefix("/uploads/")
        return f"products/{product_id}/{filename}"

    return None


async def save_image(
    image: UploadFile,
    product_id: int,
) -> str:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Format image non accepté. "
                "Utilisez JPG, PNG ou WEBP."
            ),
        )

    contents = await image.read()

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=(
                "L'image est trop grande. "
                "Maximum: 8 MB."
            ),
        )

    extension = ALLOWED_IMAGE_TYPES[image.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"
    storage_path = f"products/{product_id}/{filename}"

    try:
        supabase.storage.from_(SUPABASE_STORAGE_BUCKET).upload(
            path=storage_path,
            file=contents,
            file_options={
                "content-type": image.content_type,
                "cache-control": "3600",
                "upsert": "false",
            },
        )
    except Exception as error:
        print("STORAGE UPLOAD ERROR:", error)
        raise HTTPException(
            status_code=500,
            detail="Impossible d'envoyer l'image vers Supabase Storage.",
        ) from error

    return public_storage_url(storage_path)


def delete_image_file(
    image_url: str,
    product_id: Optional[int] = None,
) -> None:
    storage_path = storage_path_from_url(
        image_url,
        product_id,
    )

    if not storage_path:
        return

    try:
        supabase.storage.from_(SUPABASE_STORAGE_BUCKET).remove(
            [storage_path]
        )
    except Exception as error:
        # Database deletion should not be rolled back just because a
        # stale/missing Storage object cannot be removed.
        print("STORAGE DELETE WARNING:", error)


# ============================================================
# STOCK HELPERS
# ============================================================

def aggregate_cart_quantities(
    items: list[
        OrderItemCreate
    ],
) -> dict[
    int,
    int,
]:

    quantities: dict[
        int,
        int,
    ] = {}


    for item in items:

        quantities[
            item.product_id
        ] = (

            quantities.get(
                item.product_id,
                0,
            )

            + item.quantity

        )


    return quantities


def get_order_product_quantities(
    connection: object,
    order_id: int,
) -> dict[
    int,
    int,
]:

    rows = connection.execute(
        """
        SELECT
            product_id,
            SUM(quantity)
                AS quantity

        FROM order_items

        WHERE order_id = %s

        GROUP BY product_id
        """,
        (
            order_id,
        ),
    ).fetchall()


    return {

        int(
            row[
                "product_id"
            ]
        ):

        int(
            row[
                "quantity"
            ]
        )

        for row
        in rows

    }


def reserve_product_stock(
    connection: object,
    quantities: dict[
        int,
        int,
    ],
    now: str,
) -> None:

    products: dict[
        int,
        dict,
    ] = {}


    for (
        product_id,
        quantity,
    ) in quantities.items():

        product = connection.execute(
            """
            SELECT
                id,
                name,
                stock

            FROM products

            WHERE id = %s
            """,
            (
                product_id,
            ),
        ).fetchone()


        if not product:

            raise HTTPException(
                status_code=409,

                detail=(
                    "Impossible de réserver "
                    "le stock : un produit "
                    "lié à cette commande "
                    "n'existe plus."
                ),
            )


        if (
            int(
                product[
                    "stock"
                ]
            )
            < quantity
        ):

            raise HTTPException(
                status_code=409,

                detail=(
                    f"Stock insuffisant "
                    f"pour {product['name']}. "
                    f"Disponible : "
                    f"{product['stock']}, "
                    f"requis : "
                    f"{quantity}."
                ),
            )


        products[
            product_id
        ] = product


    for (
        product_id,
        quantity,
    ) in quantities.items():

        cursor = connection.execute(
            """
            UPDATE products

            SET
                stock = stock - %s,
                updated_at = %s

            WHERE id = %s

            AND stock >= %s
            """,
            (
                quantity,
                now,
                product_id,
                quantity,
            ),
        )


        if (
            cursor.rowcount
            != 1
        ):

            product = (
                products[
                    product_id
                ]
            )


            raise HTTPException(
                status_code=409,

                detail=(
                    f"Stock insuffisant "
                    f"pour "
                    f"{product['name']}."
                ),
            )


def restore_product_stock(
    connection: object,
    quantities: dict[
        int,
        int,
    ],
    now: str,
) -> None:

    for (
        product_id,
        quantity,
    ) in quantities.items():

        cursor = connection.execute(
            """
            UPDATE products

            SET
                stock = stock + %s,
                updated_at = %s

            WHERE id = %s
            """,
            (
                quantity,
                now,
                product_id,
            ),
        )


        if (
            cursor.rowcount
            != 1
        ):

            raise HTTPException(
                status_code=409,

                detail=(
                    "Impossible de restaurer "
                    "le stock : un produit "
                    "lié à cette commande "
                    "n'existe plus."
                ),
            )


# ============================================================
# ORDER HELPERS
# ============================================================

def serialize_order_with_items(
    connection: object,
    order_row: dict,
) -> dict:

    order = dict(
        order_row
    )


    items = connection.execute(
        """
        SELECT *

        FROM order_items

        WHERE order_id = %s

        ORDER BY id ASC
        """,
        (
            order_row[
                "id"
            ],
        ),
    ).fetchall()


    order[
        "items"
    ] = [

        dict(
            item
        )

        for item
        in items

    ]


    return order


# ============================================================
# HEALTH
# ============================================================

@app.get(
    "/api/health"
)
def health():

    return {

        "status":
            "ok",

        "brand":
            "ELIO Maroquinerie",

    }


# ============================================================
# PUBLIC NEWSLETTER — SUBSCRIBE
# ============================================================

@app.post(
    "/api/newsletter/subscribe"
)
def newsletter_subscribe(
    payload: NewsletterSubscribeRequest,
):

    email = normalize_newsletter_email(
        payload.email
    )


    connection = get_database()


    try:


        existing = connection.execute(
            """
            SELECT
                id,
                email,
                is_active

            FROM newsletter_subscribers

            WHERE email = %s
            FOR UPDATE
            """,
            (
                email,
            ),
        ).fetchone()


        now = current_time()


        # ====================================================
        # EXISTING SUBSCRIBER
        # ====================================================

        if existing:

            if bool(
                existing[
                    "is_active"
                ]
            ):

                connection.commit()


                return {

                    "success":
                        True,

                    "email":
                        email,

                    "already_subscribed":
                        True,

                    "message":
                        (
                            "Cette adresse e-mail "
                            "est déjà inscrite "
                            "à la newsletter ELIO."
                        ),

                }


            # Reactivate an unsubscribed subscriber.

            new_token = (
                secrets.token_urlsafe(
                    32
                )
            )


            connection.execute(
                """
                UPDATE newsletter_subscribers

                SET
                    is_active = TRUE,

                    source = 'footer',

                    unsubscribe_token = %s,

                    subscribed_at = %s,

                    unsubscribed_at = NULL,

                    updated_at = %s

                WHERE id = %s
                """,
                (
                    new_token,
                    now,
                    now,
                    existing[
                        "id"
                    ],
                ),
            )


            connection.commit()


            return {

                "success":
                    True,

                "email":
                    email,

                "already_subscribed":
                    False,

                "reactivated":
                    True,

                "message":
                    (
                        "Votre inscription "
                        "à la newsletter ELIO "
                        "est de nouveau active."
                    ),

            }


        # ====================================================
        # NEW SUBSCRIBER
        # ====================================================

        unsubscribe_token = (
            secrets.token_urlsafe(
                32
            )
        )


        cursor = connection.execute(
            """
            INSERT INTO newsletter_subscribers (

                email,

                is_active,

                source,

                unsubscribe_token,

                subscribed_at,

                unsubscribed_at,

                created_at,

                updated_at
            )

            VALUES (
                %s,
                TRUE,
                'footer',
                %s,
                %s,
                NULL,
                %s,
                %s
            )
            RETURNING id
            """,
            (
                email,
                unsubscribe_token,
                now,
                now,
                now,
            ),
        )


        connection.commit()


        return {

            "success":
                True,

            "subscriber_id":
                cursor.fetchone()["id"],

            "email":
                email,

            "already_subscribed":
                False,

            "message":
                (
                    "Merci. Votre adresse "
                    "e-mail est inscrite "
                    "à la newsletter ELIO."
                ),

        }


    except HTTPException:

        connection.rollback()

        raise


    except UniqueViolation:

        connection.rollback()


        # If two identical subscriptions arrive
        # at practically the same moment, treat the
        # duplicate as a successful subscription.

        return {

            "success":
                True,

            "email":
                email,

            "already_subscribed":
                True,

            "message":
                (
                    "Cette adresse e-mail "
                    "est déjà inscrite "
                    "à la newsletter ELIO."
                ),

        }


    except Exception as error:

        connection.rollback()


        print(
            "NEWSLETTER SUBSCRIBE ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible d'enregistrer "
                "votre inscription "
                "à la newsletter."
            ),
        )


    finally:

        connection.close()


# ============================================================
# PUBLIC NEWSLETTER — UNSUBSCRIBE
# ============================================================

@app.post(
    "/api/newsletter/unsubscribe"
)
def newsletter_unsubscribe(
    payload: NewsletterUnsubscribeRequest,
):

    token = (
        payload
        .token
        .strip()
    )


    connection = get_database()


    try:


        subscriber = connection.execute(
            """
            SELECT
                id,
                is_active

            FROM newsletter_subscribers

            WHERE unsubscribe_token = %s
            """,
            (
                token,
            ),
        ).fetchone()


        # Generic success for invalid tokens.
        # This prevents public subscriber enumeration.

        if not subscriber:

            connection.commit()


            return {

                "success":
                    True,

                "message":
                    (
                        "Votre demande "
                        "de désinscription "
                        "a été prise en compte."
                    ),

            }


        if bool(
            subscriber[
                "is_active"
            ]
        ):

            now = current_time()


            connection.execute(
                """
                UPDATE newsletter_subscribers

                SET
                    is_active = FALSE,

                    unsubscribed_at = %s,

                    updated_at = %s

                WHERE id = %s
                """,
                (
                    now,
                    now,
                    subscriber[
                        "id"
                    ],
                ),
            )


        connection.commit()


        return {

            "success":
                True,

            "message":
                (
                    "Vous êtes désinscrit(e) "
                    "de la newsletter ELIO."
                ),

        }


    except Exception as error:

        connection.rollback()


        print(
            "NEWSLETTER UNSUBSCRIBE ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible de traiter "
                "la désinscription."
            ),
        )


    finally:

        connection.close()


# ============================================================
# PUBLIC PRODUCTS
# ============================================================

@app.get(
    "/api/products"
)
def get_products():

    connection = get_database()


    try:

        rows = connection.execute(
            """
            SELECT *

            FROM products

            WHERE is_active = TRUE

            AND is_deleted = FALSE

            ORDER BY
                is_featured DESC,
                is_new DESC,
                id DESC
            """
        ).fetchall()


        return [

            serialize_product(
                connection,
                row,
            )

            for row
            in rows

        ]


    finally:

        connection.close()


@app.get(
    "/api/products/{product_slug}"
)
def get_product(
    product_slug: str,
):

    connection = get_database()


    try:

        row = connection.execute(
            """
            SELECT *

            FROM products

            WHERE slug = %s

            AND is_active = TRUE

            AND is_deleted = FALSE
            """,
            (
                product_slug,
            ),
        ).fetchone()


        if not row:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Produit introuvable."
                ),
            )


        return serialize_product(
            connection,
            row,
        )


    finally:

        connection.close()


# ============================================================
# PUBLIC ORDER CREATION
# ============================================================

@app.post(
    "/api/orders"
)
def create_order(
    payload: OrderCreate,
):

    if not payload.items:

        raise HTTPException(
            status_code=400,

            detail=(
                "Votre panier est vide."
            ),
        )


    connection = get_database()


    try:

        # Lock stock/order transaction.


        requested_quantities = (
            aggregate_cart_quantities(
                payload.items
            )
        )


        products_by_id: dict[
            int,
            dict,
        ] = {}


        # ====================================================
        # VALIDATE TOTAL QUANTITY BY PRODUCT
        # ====================================================

        for (
            product_id,
            requested_quantity,
        ) in requested_quantities.items():

            product = connection.execute(
                """
                SELECT *

                FROM products

                WHERE id = %s

                AND is_active = TRUE

                AND is_deleted = FALSE
                """,
                (
                    product_id,
                ),
            ).fetchone()


            if not product:

                raise HTTPException(
                    status_code=400,

                    detail=(
                        "Un produit de votre "
                        "panier n'est plus "
                        "disponible."
                    ),
                )


            if (
                int(
                    product[
                        "stock"
                    ]
                )
                < requested_quantity
            ):

                raise HTTPException(
                    status_code=400,

                    detail=(
                        f"Stock insuffisant "
                        f"pour "
                        f"{product['name']}. "
                        f"Disponible : "
                        f"{product['stock']}, "
                        f"demandé : "
                        f"{requested_quantity}."
                    ),
                )


            products_by_id[
                product_id
            ] = product


        validated_items = []

        subtotal = 0.0


        # ====================================================
        # VALIDATE COLORS AND PRICES
        # ====================================================

        for item in payload.items:

            product = (
                products_by_id[
                    item.product_id
                ]
            )


            try:

                available_colors = (
                    json.loads(
                        product[
                            "colors"
                        ]
                    )
                )

            except Exception:

                available_colors = []


            selected_color = (
                item.color.strip()
            )


            if available_colors:

                if (
                    selected_color
                    not in available_colors
                ):

                    raise HTTPException(
                        status_code=400,

                        detail=(
                            f"Couleur invalide "
                            f"pour "
                            f"{product['name']}."
                        ),
                    )

            else:

                selected_color = ""


            unit_price = float(
                product[
                    "price"
                ]
            )


            line_total = round(
                unit_price
                * item.quantity,
                3,
            )


            subtotal += (
                line_total
            )


            validated_items.append(
                {

                    "product":
                        product,

                    "color":
                        selected_color,

                    "quantity":
                        item.quantity,

                    "unit_price":
                        unit_price,

                    "line_total":
                        line_total,

                    "image_url":
                        get_main_image(
                            connection,
                            product[
                                "id"
                            ],
                        ),

                }
            )


        subtotal = round(
            subtotal,
            3,
        )


        # ====================================================
        # DELIVERY
        # ====================================================

        delivery_fee = (
            DELIVERY_FEE
        )


        total = round(
            subtotal
            + delivery_fee,
            3,
        )


        now = current_time()


        order_number = (
            generate_order_number(
                connection
            )
        )


        # ====================================================
        # INSERT ORDER
        # ====================================================

        cursor = connection.execute(
            """
            INSERT INTO orders (

                order_number,

                customer_name,

                phone,

                email,

                governorate,

                city,

                address,

                notes,

                payment_method,

                subtotal,

                delivery_fee,

                total,

                status,

                created_at,

                updated_at
            )

            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            RETURNING id
            """,
            (
                order_number,

                payload
                .customer_name
                .strip(),

                payload
                .phone
                .strip(),

                (
                    payload.email.strip()

                    if payload.email

                    else None
                ),

                payload
                .governorate
                .strip(),

                payload
                .city
                .strip(),

                payload
                .address
                .strip(),

                payload
                .notes
                .strip(),

                "cash_on_delivery",

                subtotal,

                delivery_fee,

                total,

                "Nouvelle",

                now,

                now,
            ),
        )


        order_id = (
            cursor.fetchone()["id"]
        )


        # ====================================================
        # INSERT ORDER ITEMS
        # ====================================================

        for item in validated_items:

            product = (
                item[
                    "product"
                ]
            )


            connection.execute(
                """
                INSERT INTO order_items (

                    order_id,

                    product_id,

                    product_name,

                    sku,

                    color,

                    quantity,

                    unit_price,

                    line_total,

                    image_url,

                    created_at
                )

                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
                """,
                (
                    order_id,

                    product[
                        "id"
                    ],

                    product[
                        "name"
                    ],

                    product[
                        "sku"
                    ],

                    item[
                        "color"
                    ],

                    item[
                        "quantity"
                    ],

                    item[
                        "unit_price"
                    ],

                    item[
                        "line_total"
                    ],

                    item[
                        "image_url"
                    ],

                    now,
                ),
            )


        # ====================================================
        # RESERVE STOCK
        # ====================================================

        reserve_product_stock(
            connection,
            requested_quantities,
            now,
        )


        connection.commit()


        return {

            "success":
                True,

            "order_id":
                order_id,

            "order_number":
                order_number,

            "subtotal":
                subtotal,

            "delivery_fee":
                delivery_fee,

            "total":
                total,

            "status":
                "Nouvelle",

        }


    except HTTPException:

        connection.rollback()

        raise


    except Exception as error:

        connection.rollback()


        print(
            "ORDER ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible d'enregistrer "
                "la commande."
            ),
        )


    finally:

        connection.close()


# ============================================================
# ADMIN NEWSLETTER — LIST
# ============================================================

@app.get(
    "/api/admin/newsletter"
)
def admin_get_newsletter_subscribers(

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:

        rows = connection.execute(
            """
            SELECT
                id,
                email,
                is_active,
                source,
                subscribed_at,
                unsubscribed_at,
                created_at,
                updated_at

            FROM newsletter_subscribers

            ORDER BY
                is_active DESC,
                subscribed_at DESC,
                id DESC
            """
        ).fetchall()


        return [

            {

                **dict(
                    row
                ),

                "is_active":
                    bool(
                        row[
                            "is_active"
                        ]
                    ),

            }

            for row
            in rows

        ]


    finally:

        connection.close()


# ============================================================
# ADMIN NEWSLETTER — DELETE
# ============================================================

@app.delete(
    "/api/admin/newsletter/{subscriber_id}"
)
def admin_delete_newsletter_subscriber(

    subscriber_id: int,

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:


        subscriber = connection.execute(
            """
            SELECT
                id,
                email

            FROM newsletter_subscribers

            WHERE id = %s
            """,
            (
                subscriber_id,
            ),
        ).fetchone()


        if not subscriber:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Abonné introuvable."
                ),
            )


        connection.execute(
            """
            DELETE FROM newsletter_subscribers

            WHERE id = %s
            """,
            (
                subscriber_id,
            ),
        )


        connection.commit()


        return {

            "success":
                True,

            "subscriber_id":
                subscriber_id,

            "email":
                subscriber[
                    "email"
                ],

            "message":
                (
                    "L'abonné a été supprimé "
                    "de la newsletter."
                ),

        }


    except HTTPException:

        connection.rollback()

        raise


    except Exception as error:

        connection.rollback()


        print(
            "NEWSLETTER DELETE ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible de supprimer "
                "cet abonné."
            ),
        )


    finally:

        connection.close()


# ============================================================
# ADMIN PRODUCTS — LIST
# ============================================================

@app.get(
    "/api/admin/products"
)
def admin_get_products(

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:

        rows = connection.execute(
            """
            SELECT *

            FROM products

            WHERE is_deleted = FALSE

            ORDER BY id DESC
            """
        ).fetchall()


        return [

            serialize_product(
                connection,
                row,
            )

            for row
            in rows

        ]


    finally:

        connection.close()


# ============================================================
# ADMIN PRODUCTS — CREATE
# ============================================================

@app.post(
    "/api/admin/products"
)
async def admin_create_product(

    name: str = Form(...),

    category: str = Form(...),

    price: float = Form(...),

    compare_at_price: Optional[
        float
    ] = Form(
        None
    ),

    description: str = Form(
        ""
    ),

    material: str = Form(
        ""
    ),

    dimensions: str = Form(
        ""
    ),

    colors: str = Form(
        ""
    ),

    stock: int = Form(
        0
    ),

    sku: str = Form(
        ""
    ),

    is_new: bool = Form(
        False
    ),

    is_featured: bool = Form(
        False
    ),

    is_active: bool = Form(
        True
    ),

    images: list[
        UploadFile
    ] = File(
        default=[]
    ),

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    clean_name = (
        name.strip()
    )


    clean_category = (
        category.strip()
    )


    if (
        len(clean_name)
        < 2
    ):

        raise HTTPException(
            status_code=400,

            detail=(
                "Le nom du produit "
                "est obligatoire."
            ),
        )


    if (
        len(clean_category)
        < 2
    ):

        raise HTTPException(
            status_code=400,

            detail=(
                "La catégorie "
                "est obligatoire."
            ),
        )


    if (
        price < 0
    ):

        raise HTTPException(
            status_code=400,

            detail=(
                "Le prix ne peut "
                "pas être négatif."
            ),
        )


    if (
        stock < 0
    ):

        raise HTTPException(
            status_code=400,

            detail=(
                "Le stock ne peut "
                "pas être négatif."
            ),
        )


    connection = get_database()


    uploaded_urls: list[
        str
    ] = []


    try:


        slug = unique_slug(
            connection,
            clean_name,
        )


        final_sku = (

            sku
            .strip()
            .upper()

            if sku.strip()

            else generate_sku()

        )


        existing_sku = (
            connection.execute(
                """
                SELECT id

                FROM products

                WHERE sku = %s
                """,
                (
                    final_sku,
                ),
            ).fetchone()
        )


        if existing_sku:

            raise HTTPException(
                status_code=400,

                detail=(
                    "Ce SKU existe déjà."
                ),
            )


        now = current_time()


        cursor = connection.execute(
            """
            INSERT INTO products (

                name,

                slug,

                sku,

                category,

                price,

                compare_at_price,

                description,

                material,

                dimensions,

                colors,

                stock,

                is_new,

                is_featured,

                is_active,

                is_deleted,

                created_at,

                updated_at
            )

            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, FALSE,
                %s, %s
            )
            RETURNING id
            """,
            (
                clean_name,

                slug,

                final_sku,

                clean_category,

                price,

                compare_at_price,

                description.strip(),

                material.strip(),

                dimensions.strip(),

                json.dumps(
                    parse_colors(
                        colors
                    ),
                    ensure_ascii=False,
                ),

                stock,

                bool(
                    is_new
                ),

                bool(
                    is_featured
                ),

                bool(
                    is_active
                ),

                now,

                now,
            ),
        )


        product_id = (
            cursor.fetchone()["id"]
        )


        # ====================================================
        # IMAGES
        # ====================================================

        for (
            position,
            image,
        ) in enumerate(
            images
        ):

            image_url = (
                await save_image(
                        image,
                        product_id,
                    )
            )


            uploaded_urls.append(
                image_url
            )


            connection.execute(
                """
                INSERT INTO product_images (

                    product_id,

                    image_url,

                    position,

                    created_at
                )

                VALUES (%s, %s, %s, %s)
                """,
                (
                    product_id,

                    image_url,

                    position,

                    now,
                ),
            )


        connection.commit()


        row = connection.execute(
            """
            SELECT *

            FROM products

            WHERE id = %s

            AND is_deleted = FALSE
            """,
            (
                product_id,
            ),
        ).fetchone()


        return serialize_product(
            connection,
            row,
        )


    except HTTPException:

        connection.rollback()


        for image_url in uploaded_urls:

            delete_image_file(
                image_url,
                product_id,
            )


        raise


    except Exception as error:

        connection.rollback()


        for image_url in uploaded_urls:

            delete_image_file(
                image_url,
                product_id,
            )


        print(
            "PRODUCT CREATE ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible de créer "
                "le produit."
            ),
        )


    finally:

        connection.close()


# ============================================================
# ADMIN PRODUCTS — UPDATE
# ============================================================

@app.put(
    "/api/admin/products/{product_id}"
)
def admin_update_product(

    product_id: int,

    payload: ProductUpdate,

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:

        existing = connection.execute(
            """
            SELECT *

            FROM products

            WHERE id = %s

            AND is_deleted = FALSE
            """,
            (
                product_id,
            ),
        ).fetchone()


        if not existing:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Produit introuvable."
                ),
            )


        updates = (
            payload.model_dump(
                exclude_unset=True
            )
        )


        allowed_fields = {

            "name",

            "category",

            "price",

            "compare_at_price",

            "description",

            "material",

            "dimensions",

            "colors",

            "stock",

            "is_new",

            "is_featured",

            "is_active",

        }


        parts: list[
            str
        ] = []


        values: list[
            object
        ] = []


        for (
            key,
            value,
        ) in updates.items():

            if (
                key
                not in allowed_fields
            ):

                continue


            if (
                key
                == "colors"
            ):

                value = json.dumps(
                    value or [],
                    ensure_ascii=False,
                )


            if key in {

                "is_new",

                "is_featured",

                "is_active",

            }:

                value = bool(
                    value
                )


            if (
                key == "price"
                and value is not None
                and value < 0
            ):

                raise HTTPException(
                    status_code=400,

                    detail=(
                        "Le prix ne peut "
                        "pas être négatif."
                    ),
                )


            if (
                key == "stock"
                and value is not None
                and value < 0
            ):

                raise HTTPException(
                    status_code=400,

                    detail=(
                        "Le stock ne peut "
                        "pas être négatif."
                    ),
                )


            parts.append(
                f"{key} = %s"
            )


            values.append(
                value
            )


        if parts:

            parts.append(
                "updated_at = %s"
            )


            values.append(
                current_time()
            )


            values.append(
                product_id
            )


            connection.execute(
                f"""
                UPDATE products

                SET {
                    ", ".join(
                        parts
                    )
                }

                WHERE id = %s

                AND is_deleted = FALSE
                """,
                values,
            )


            connection.commit()


        row = connection.execute(
            """
            SELECT *

            FROM products

            WHERE id = %s

            AND is_deleted = FALSE
            """,
            (
                product_id,
            ),
        ).fetchone()


        return serialize_product(
            connection,
            row,
        )


    finally:

        connection.close()


# ============================================================
# ADMIN PRODUCTS — ADD IMAGES
# ============================================================

@app.post(
    "/api/admin/products/{product_id}/images"
)
async def admin_add_product_images(

    product_id: int,

    images: list[
        UploadFile
    ] = File(...),

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    uploaded_urls: list[
        str
    ] = []


    try:

        product = connection.execute(
            """
            SELECT id

            FROM products

            WHERE id = %s

            AND is_deleted = FALSE
            """,
            (
                product_id,
            ),
        ).fetchone()


        if not product:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Produit introuvable."
                ),
            )


        count_row = connection.execute(
            """
            SELECT
                COUNT(*) AS total

            FROM product_images

            WHERE product_id = %s
            """,
            (
                product_id,
            ),
        ).fetchone()


        start_position = int(
            count_row[
                "total"
            ]
        )


        for (
            index,
            image,
        ) in enumerate(
            images
        ):

            image_url = (
                await save_image(
                        image,
                        product_id,
                    )
            )


            uploaded_urls.append(
                image_url
            )


            connection.execute(
                """
                INSERT INTO product_images (

                    product_id,

                    image_url,

                    position,

                    created_at
                )

                VALUES (%s, %s, %s, %s)
                """,
                (
                    product_id,

                    image_url,

                    start_position
                    + index,

                    current_time(),
                ),
            )


        connection.commit()


        row = connection.execute(
            """
            SELECT *

            FROM products

            WHERE id = %s

            AND is_deleted = FALSE
            """,
            (
                product_id,
            ),
        ).fetchone()


        return serialize_product(
            connection,
            row,
        )


    except HTTPException:

        connection.rollback()


        for image_url in uploaded_urls:

            delete_image_file(
                image_url,
                product_id,
            )


        raise


    except Exception as error:

        connection.rollback()


        for image_url in uploaded_urls:

            delete_image_file(
                image_url,
                product_id,
            )


        print(
            "PRODUCT IMAGE ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible d'ajouter "
                "les images."
            ),
        )


    finally:

        connection.close()


# ============================================================
# ADMIN PRODUCTS — DELETE IMAGE
# ============================================================

@app.delete(
    "/api/admin/products/"
    "{product_id}/images/"
    "{image_id}"
)
def admin_delete_product_image(

    product_id: int,

    image_id: int,

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:

        image = connection.execute(
            """
            SELECT
                pi.*

            FROM product_images AS pi

            INNER JOIN products AS p

                ON p.id =
                   pi.product_id

            WHERE pi.id = %s

            AND pi.product_id = %s

            AND p.is_deleted = FALSE
            """,
            (
                image_id,
                product_id,
            ),
        ).fetchone()


        if not image:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Image introuvable."
                ),
            )


        connection.execute(
            """
            DELETE FROM product_images

            WHERE id = %s
            """,
            (
                image_id,
            ),
        )


        connection.commit()


        delete_image_file(
            image[
                "image_url"
            ],
            product_id,
        )


        return {

            "success":
                True

        }


    finally:

        connection.close()


# ============================================================
# ADMIN PRODUCTS — SAFE DELETE
# ============================================================

@app.delete(
    "/api/admin/products/{product_id}"
)
def admin_delete_product(

    product_id: int,

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:


        product = connection.execute(
            """
            SELECT
                id,
                name,
                is_deleted

            FROM products

            WHERE id = %s
            """,
            (
                product_id,
            ),
        ).fetchone()


        if not product:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Produit introuvable."
                ),
            )


        if bool(
            product[
                "is_deleted"
            ]
        ):

            connection.commit()


            return {

                "success":
                    True,

                "deleted":
                    True,

                "product_id":
                    product_id,

                "message":
                    (
                        "Produit déjà supprimé "
                        "de la boutique."
                    ),

            }


        connection.execute(
            """
            UPDATE products

            SET
                is_deleted = TRUE,

                is_active = FALSE,

                updated_at = %s

            WHERE id = %s
            """,
            (
                current_time(),
                product_id,
            ),
        )


        connection.commit()


        return {

            "success":
                True,

            "deleted":
                True,

            "product_id":
                product_id,

            "message":
                (
                    f"{product['name']} "
                    "a été supprimé "
                    "de la boutique."
                ),

        }


    except HTTPException:

        connection.rollback()

        raise


    except Exception as error:

        connection.rollback()


        print(
            "PRODUCT DELETE ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible de supprimer "
                "le produit."
            ),
        )


    finally:

        connection.close()


# ============================================================
# ADMIN ORDERS — LIST
# ============================================================

@app.get(
    "/api/admin/orders"
)
def admin_get_orders(

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:

        rows = connection.execute(
            """
            SELECT *

            FROM orders

            WHERE is_deleted = FALSE

            ORDER BY id DESC
            """
        ).fetchall()


        return [

            serialize_order_with_items(
                connection,
                row,
            )

            for row
            in rows

        ]


    finally:

        connection.close()


# ============================================================
# ADMIN ORDERS — DETAILS
# ============================================================

@app.get(
    "/api/admin/orders/{order_id}"
)
def admin_get_order(

    order_id: int,

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:

        row = connection.execute(
            """
            SELECT *

            FROM orders

            WHERE id = %s

            AND is_deleted = FALSE
            """,
            (
                order_id,
            ),
        ).fetchone()


        if not row:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Commande introuvable."
                ),
            )


        return serialize_order_with_items(
            connection,
            row,
        )


    finally:

        connection.close()


# ============================================================
# ADMIN ORDERS — STATUS
# ============================================================

@app.patch(
    "/api/admin/orders/{order_id}/status"
)
def admin_update_order_status(

    order_id: int,

    payload: OrderStatusUpdate,

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    check_admin_key(
        x_admin_key
    )


    new_status = (
        payload
        .status
        .strip()
    )


    if (
        new_status
        not in ORDER_STATUSES
    ):

        raise HTTPException(
            status_code=400,

            detail=(
                "Statut invalide."
            ),
        )


    connection = get_database()


    try:


        order = connection.execute(
            """
            SELECT
                id,
                status

            FROM orders

            WHERE id = %s

            AND is_deleted = FALSE
            """,
            (
                order_id,
            ),
        ).fetchone()


        if not order:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Commande introuvable."
                ),
            )


        old_status = (
            order[
                "status"
            ]
        )


        # ====================================================
        # SAME STATUS
        # ====================================================

        if (
            old_status
            == new_status
        ):

            connection.commit()


            return {

                "success":
                    True,

                "status":
                    new_status,

                "previous_status":
                    old_status,

                "stock_action":
                    "unchanged",

            }


        quantities = (
            get_order_product_quantities(
                connection,
                order_id,
            )
        )


        now = current_time()


        old_cancelled = (
            old_status
            == "Annulée"
        )


        new_cancelled = (
            new_status
            == "Annulée"
        )


        stock_action = (
            "unchanged"
        )


        # ====================================================
        # ACTIVE -> CANCELLED
        # Restore stock.
        # ====================================================

        if (
            not old_cancelled
            and new_cancelled
        ):

            restore_product_stock(
                connection,
                quantities,
                now,
            )


            stock_action = (
                "restored"
            )


        # ====================================================
        # CANCELLED -> ACTIVE
        # Reserve stock again.
        # ====================================================

        elif (
            old_cancelled
            and not new_cancelled
        ):

            reserve_product_stock(
                connection,
                quantities,
                now,
            )


            stock_action = (
                "reserved"
            )


        connection.execute(
            """
            UPDATE orders

            SET
                status = %s,

                updated_at = %s

            WHERE id = %s
            """,
            (
                new_status,
                now,
                order_id,
            ),
        )


        connection.commit()


        return {

            "success":
                True,

            "status":
                new_status,

            "previous_status":
                old_status,

            "stock_action":
                stock_action,

        }


    except HTTPException:

        connection.rollback()

        raise


    except Exception as error:

        connection.rollback()


        print(
            "ORDER STATUS ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible de modifier "
                "le statut de la commande."
            ),
        )


    finally:

        connection.close()


# ============================================================
# ADMIN ORDERS — SAFE DELETE
# ============================================================

@app.delete(
    "/api/admin/orders/{order_id}"
)
def admin_delete_order(

    order_id: int,

    x_admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key",
    ),

):

    """
    Removes an order from the admin interface without
    destroying its historical database record.

    Stock behavior:
    - Annulée: stock was already restored -> no change.
    - Livrée: the sale is final -> no stock restoration.
    - Other statuses: reserved stock is restored once.

    The order and its items remain in SQLite with
    is_deleted = TRUE so order numbers are never reused
    and historical data is not physically destroyed.
    """

    check_admin_key(
        x_admin_key
    )


    connection = get_database()


    try:


        order = connection.execute(
            """
            SELECT
                id,
                order_number,
                status,
                is_deleted

            FROM orders

            WHERE id = %s
            FOR UPDATE
            """,
            (
                order_id,
            ),
        ).fetchone()


        if not order:

            raise HTTPException(
                status_code=404,

                detail=(
                    "Commande introuvable."
                ),
            )


        if bool(
            order[
                "is_deleted"
            ]
        ):

            connection.commit()


            return {

                "success":
                    True,

                "deleted":
                    True,

                "order_id":
                    order_id,

                "stock_action":
                    "unchanged",

                "message":
                    (
                        "Commande déjà supprimée "
                        "de l'espace administrateur."
                    ),

            }


        now = current_time()


        stock_action = (
            "unchanged"
        )


        # ----------------------------------------------------
        # Restore stock only for non-final active orders.
        # ----------------------------------------------------
        #
        # Annulée -> stock was already restored by the
        # status transition.
        #
        # Livrée -> the merchandise was sold/delivered,
        # so deleting the admin record must not create
        # artificial stock.
        # ----------------------------------------------------

        if (
            order[
                "status"
            ]
            not in {
                "Annulée",
                "Livrée",
            }
        ):

            quantities = (
                get_order_product_quantities(
                    connection,
                    order_id,
                )
            )


            restore_product_stock(
                connection,
                quantities,
                now,
            )


            stock_action = (
                "restored"
            )


        elif (
            order[
                "status"
            ]
            == "Annulée"
        ):

            stock_action = (
                "already_restored"
            )


        elif (
            order[
                "status"
            ]
            == "Livrée"
        ):

            stock_action = (
                "kept_sold"
            )


        connection.execute(
            """
            UPDATE orders

            SET
                is_deleted = TRUE,

                deleted_at = %s,

                updated_at = %s

            WHERE id = %s
            """,
            (
                now,
                now,
                order_id,
            ),
        )


        connection.commit()


        return {

            "success":
                True,

            "deleted":
                True,

            "order_id":
                order_id,

            "order_number":
                order[
                    "order_number"
                ],

            "previous_status":
                order[
                    "status"
                ],

            "stock_action":
                stock_action,

            "message":
                (
                    f"Commande "
                    f"{order['order_number']} "
                    "supprimée de l'espace "
                    "administrateur."
                ),

        }


    except HTTPException:

        connection.rollback()

        raise


    except Exception as error:

        connection.rollback()


        print(
            "ORDER DELETE ERROR:",
            error,
        )


        raise HTTPException(
            status_code=500,

            detail=(
                "Impossible de supprimer "
                "la commande."
            ),
        )


    finally:

        connection.close()

