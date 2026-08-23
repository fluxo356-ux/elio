from __future__ import annotations

import mimetypes
import os
import sqlite3
from pathlib import Path
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from supabase import create_client


# ============================================================
# PATHS / ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
SQLITE_PATH = BASE_DIR / "elio.db"
UPLOAD_DIR = BASE_DIR / "uploads"

# For this local migration utility, backend/.env is the source of truth.
# override=True prevents stale PowerShell environment variables from
# silently pointing the migration at another database/project.
load_dotenv(BASE_DIR / ".env", override=True)

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")

SUPABASE_SECRET_KEY = (
    os.environ.get("SUPABASE_SECRET_KEY")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or ""
).strip()

SUPABASE_STORAGE_BUCKET = os.environ.get(
    "SUPABASE_STORAGE_BUCKET",
    "",
).strip()


TABLES = [
    "products",
    "product_images",
    "orders",
    "order_items",
    "newsletter_subscribers",
]


# ============================================================
# ERRORS
# ============================================================

class MigrationError(RuntimeError):
    pass


# ============================================================
# ENVIRONMENT VALIDATION
# ============================================================

def require_environment() -> None:
    missing = []

    for name, value in [
        ("DATABASE_URL", DATABASE_URL),
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SECRET_KEY", SUPABASE_SECRET_KEY),
        ("SUPABASE_STORAGE_BUCKET", SUPABASE_STORAGE_BUCKET),
    ]:
        if not value:
            missing.append(name)

    if missing:
        raise MigrationError(
            "Missing environment variable(s): "
            + ", ".join(missing)
        )

    if not SQLITE_PATH.exists():
        raise MigrationError(
            f"Local database not found: {SQLITE_PATH}"
        )

    if not UPLOAD_DIR.exists():
        raise MigrationError(
            f"Local uploads folder not found: {UPLOAD_DIR}"
        )


# ============================================================
# DATABASE CONNECTIONS
# ============================================================

def sqlite_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(SQLITE_PATH)

    connection.row_factory = sqlite3.Row

    connection.execute(
        "PRAGMA foreign_keys = ON"
    )

    return connection


def postgres_connection() -> psycopg.Connection:
    return psycopg.connect(
        DATABASE_URL,
        sslmode="require",
        gssencmode="disable",
        connect_timeout=10,
        row_factory=dict_row,

        # Better compatibility with Supabase transaction/shared poolers.
        prepare_threshold=None,
    )


# ============================================================
# SOURCE / DESTINATION HELPERS
# ============================================================

def get_local_rows(
    connection: sqlite3.Connection,
    table: str,
) -> list[dict[str, Any]]:

    rows = connection.execute(
        f"SELECT * FROM {table} ORDER BY id ASC"
    ).fetchall()

    return [
        dict(row)
        for row in rows
    ]


def destination_count(
    connection: psycopg.Connection,
    table: str,
) -> int:

    row = connection.execute(
        f"SELECT COUNT(*) AS total FROM {table}"
    ).fetchone()

    return int(
        row["total"]
    )


def ensure_destination_is_empty(
    connection: psycopg.Connection,
) -> None:

    non_empty = []

    for table in TABLES:
        total = destination_count(
            connection,
            table,
        )

        if total != 0:
            non_empty.append(
                f"{table}={total}"
            )

    if non_empty:
        raise MigrationError(
            "Supabase is not empty. "
            "Migration stopped to prevent duplicates: "
            + ", ".join(non_empty)
        )


# ============================================================
# DATA CONVERSION
# ============================================================

def parse_colors(
    value: Any,
) -> list[str]:

    if value is None:
        return []

    if isinstance(
        value,
        list,
    ):
        return [
            str(item)
            for item in value
        ]

    import json

    try:
        parsed = json.loads(
            str(value)
        )

        if isinstance(
            parsed,
            list,
        ):
            return [
                str(item)
                for item in parsed
            ]

    except Exception:
        pass

    return []


def as_bool(
    value: Any,
) -> bool:

    return bool(
        int(
            value
            or 0
        )
    )


# ============================================================
# STORAGE HELPERS
# ============================================================

def storage_public_url(
    storage_path: str,
) -> str:

    return (
        f"{SUPABASE_URL}"
        f"/storage/v1/object/public/"
        f"{SUPABASE_STORAGE_BUCKET}/"
        f"{storage_path}"
    )


def local_image_path(
    image_url: str,
) -> Path:

    prefix = "/uploads/"

    if not image_url.startswith(
        prefix
    ):
        raise MigrationError(
            "Unsupported local image URL "
            f"during migration: {image_url}"
        )

    filename = image_url[
        len(prefix):
    ]

    path = (
        UPLOAD_DIR
        / filename
    )

    if not path.exists():
        raise MigrationError(
            f"Image file missing: {path}"
        )

    return path


def upload_local_image(
    storage: Any,
    product_id: int,
    image_url: str,
) -> tuple[str, str]:

    path = local_image_path(
        image_url
    )

    storage_path = (
        f"products/"
        f"{product_id}/"
        f"{path.name}"
    )

    content_type = (
        mimetypes.guess_type(
            path.name
        )[0]
        or "application/octet-stream"
    )

    contents = path.read_bytes()

    # Important:
    #
    # The first migration already uploaded the five image objects,
    # even though the PostgreSQL transaction did not remain committed.
    #
    # upsert=true allows the migration to safely synchronize those
    # same deterministic paths instead of failing because they exist.
    storage.from_(
        SUPABASE_STORAGE_BUCKET
    ).upload(
        storage_path,
        contents,
        file_options={
            "content-type":
                content_type,

            "cache-control":
                "3600",

            "upsert":
                "true",
        },
    )

    return (
        storage_path,
        storage_public_url(
            storage_path
        ),
    )


# ============================================================
# PRODUCTS
# ============================================================

def insert_product(
    connection: psycopg.Connection,
    row: dict[str, Any],
) -> None:

    connection.execute(
        """
        INSERT INTO products (
            id,
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
            %(id)s,
            %(name)s,
            %(slug)s,
            %(sku)s,
            %(category)s,
            %(price)s,
            %(compare_at_price)s,
            %(description)s,
            %(material)s,
            %(dimensions)s,
            %(colors)s,
            %(stock)s,
            %(is_new)s,
            %(is_featured)s,
            %(is_active)s,
            %(is_deleted)s,
            %(created_at)s,
            %(updated_at)s
        )
        """,
        {
            "id":
                row["id"],

            "name":
                row["name"],

            "slug":
                row["slug"],

            "sku":
                row["sku"],

            "category":
                row["category"],

            "price":
                row["price"],

            "compare_at_price":
                row.get(
                    "compare_at_price"
                ),

            "description":
                row.get(
                    "description",
                    "",
                ),

            "material":
                row.get(
                    "material",
                    "",
                ),

            "dimensions":
                row.get(
                    "dimensions",
                    "",
                ),

            "colors":
                Jsonb(
                    parse_colors(
                        row.get(
                            "colors"
                        )
                    )
                ),

            "stock":
                row.get(
                    "stock",
                    0,
                ),

            "is_new":
                as_bool(
                    row.get(
                        "is_new"
                    )
                ),

            "is_featured":
                as_bool(
                    row.get(
                        "is_featured"
                    )
                ),

            "is_active":
                as_bool(
                    row.get(
                        "is_active",
                        1,
                    )
                ),

            "is_deleted":
                as_bool(
                    row.get(
                        "is_deleted",
                        0,
                    )
                ),

            "created_at":
                row["created_at"],

            "updated_at":
                row["updated_at"],
        },
    )


# ============================================================
# PRODUCT IMAGES
# ============================================================

def insert_product_image(
    connection: psycopg.Connection,
    row: dict[str, Any],
    new_image_url: str,
    storage_path: str,
) -> None:

    connection.execute(
        """
        INSERT INTO product_images (
            id,
            product_id,
            image_url,
            storage_path,
            position,
            created_at
        )
        VALUES (
            %(id)s,
            %(product_id)s,
            %(image_url)s,
            %(storage_path)s,
            %(position)s,
            %(created_at)s
        )
        """,
        {
            "id":
                row["id"],

            "product_id":
                row["product_id"],

            "image_url":
                new_image_url,

            "storage_path":
                storage_path,

            "position":
                row.get(
                    "position",
                    0,
                ),

            "created_at":
                row["created_at"],
        },
    )


# ============================================================
# ORDERS
# ============================================================

def insert_order(
    connection: psycopg.Connection,
    row: dict[str, Any],
) -> None:

    connection.execute(
        """
        INSERT INTO orders (
            id,
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
            is_deleted,
            deleted_at,
            created_at,
            updated_at
        )
        VALUES (
            %(id)s,
            %(order_number)s,
            %(customer_name)s,
            %(phone)s,
            %(email)s,
            %(governorate)s,
            %(city)s,
            %(address)s,
            %(notes)s,
            %(payment_method)s,
            %(subtotal)s,
            %(delivery_fee)s,
            %(total)s,
            %(status)s,
            %(is_deleted)s,
            %(deleted_at)s,
            %(created_at)s,
            %(updated_at)s
        )
        """,
        {
            "id":
                row["id"],

            "order_number":
                row["order_number"],

            "customer_name":
                row["customer_name"],

            "phone":
                row["phone"],

            "email":
                row.get(
                    "email"
                ),

            "governorate":
                row["governorate"],

            "city":
                row["city"],

            "address":
                row["address"],

            "notes":
                row.get(
                    "notes",
                    "",
                ),

            "payment_method":
                row.get(
                    "payment_method",
                    "cash_on_delivery",
                ),

            "subtotal":
                row["subtotal"],

            "delivery_fee":
                row.get(
                    "delivery_fee",
                    0,
                ),

            "total":
                row["total"],

            "status":
                row.get(
                    "status",
                    "Nouvelle",
                ),

            "is_deleted":
                as_bool(
                    row.get(
                        "is_deleted",
                        0,
                    )
                ),

            "deleted_at":
                row.get(
                    "deleted_at"
                ),

            "created_at":
                row["created_at"],

            "updated_at":
                row["updated_at"],
        },
    )


# ============================================================
# ORDER ITEMS
# ============================================================

def insert_order_item(
    connection: psycopg.Connection,
    row: dict[str, Any],
    image_url_map: dict[str, str],
) -> None:

    old_image_url = row.get(
        "image_url"
    )

    new_image_url = (
        image_url_map.get(
            old_image_url,
            old_image_url,
        )
    )

    connection.execute(
        """
        INSERT INTO order_items (
            id,
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
            %(id)s,
            %(order_id)s,
            %(product_id)s,
            %(product_name)s,
            %(sku)s,
            %(color)s,
            %(quantity)s,
            %(unit_price)s,
            %(line_total)s,
            %(image_url)s,
            %(created_at)s
        )
        """,
        {
            "id":
                row["id"],

            "order_id":
                row["order_id"],

            "product_id":
                row["product_id"],

            "product_name":
                row["product_name"],

            "sku":
                row["sku"],

            "color":
                row.get(
                    "color",
                    "",
                ),

            "quantity":
                row["quantity"],

            "unit_price":
                row["unit_price"],

            "line_total":
                row["line_total"],

            "image_url":
                new_image_url,

            "created_at":
                row["created_at"],
        },
    )


# ============================================================
# NEWSLETTER
# ============================================================

def insert_newsletter_subscriber(
    connection: psycopg.Connection,
    row: dict[str, Any],
) -> None:

    connection.execute(
        """
        INSERT INTO newsletter_subscribers (
            id,
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
            %(id)s,
            %(email)s,
            %(is_active)s,
            %(source)s,
            %(unsubscribe_token)s,
            %(subscribed_at)s,
            %(unsubscribed_at)s,
            %(created_at)s,
            %(updated_at)s
        )
        """,
        {
            "id":
                row["id"],

            "email":
                row["email"],

            "is_active":
                as_bool(
                    row.get(
                        "is_active",
                        1,
                    )
                ),

            "source":
                row.get(
                    "source",
                    "footer",
                ),

            "unsubscribe_token":
                row["unsubscribe_token"],

            "subscribed_at":
                row["subscribed_at"],

            "unsubscribed_at":
                row.get(
                    "unsubscribed_at"
                ),

            "created_at":
                row["created_at"],

            "updated_at":
                row["updated_at"],
        },
    )


# ============================================================
# IDENTITY SEQUENCES
# ============================================================

def reset_identity_sequence(
    connection: psycopg.Connection,
    table: str,
) -> None:

    sequence_row = connection.execute(
        """
        SELECT
            pg_get_serial_sequence(
                %s,
                'id'
            ) AS sequence_name
        """,
        (
            table,
        ),
    ).fetchone()

    sequence_name = (
        sequence_row[
            "sequence_name"
        ]
    )

    if not sequence_name:
        return

    max_row = connection.execute(
        f"""
        SELECT
            MAX(id) AS max_id,
            COUNT(*) AS total
        FROM {table}
        """
    ).fetchone()

    total = int(
        max_row["total"]
    )

    max_id = int(
        max_row["max_id"]
        or 0
    )

    if total > 0:

        connection.execute(
            """
            SELECT setval(
                %s::regclass,
                %s,
                true
            )
            """,
            (
                sequence_name,
                max_id,
            ),
        )

    else:

        connection.execute(
            """
            SELECT setval(
                %s::regclass,
                1,
                false
            )
            """,
            (
                sequence_name,
            ),
        )


# ============================================================
# VERIFICATION
# ============================================================

def verify_counts(
    postgres: psycopg.Connection,
    source_counts: dict[str, int],
) -> None:

    errors = []

    print(
        "\nMIGRATION VERIFICATION"
    )

    for table in TABLES:

        destination = destination_count(
            postgres,
            table,
        )

        source = source_counts[
            table
        ]

        print(
            f"{table}: "
            f"local={source}, "
            f"supabase={destination}"
        )

        if destination != source:

            errors.append(
                f"{table}: "
                f"local={source}, "
                f"supabase={destination}"
            )

    if errors:

        raise MigrationError(
            "Count verification failed: "
            + "; ".join(
                errors
            )
        )


# ============================================================
# MIGRATION
# ============================================================

def main() -> None:

    require_environment()

    sqlite_db = sqlite_connection()
    postgres = postgres_connection()

    supabase = create_client(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
    )

    synced_storage_paths: list[
        str
    ] = []

    try:

        # ====================================================
        # READ LOCAL SQLITE DATA
        # ====================================================

        source_rows = {
            table:
                get_local_rows(
                    sqlite_db,
                    table,
                )
            for table
            in TABLES
        }

        source_counts = {
            table:
                len(rows)
            for (
                table,
                rows,
            )
            in source_rows.items()
        }

        print(
            "LOCAL DATA"
        )

        for table in TABLES:

            print(
                f"{table}: "
                f"{source_counts[table]}"
            )


        # ====================================================
        # VALIDATE ALL LOCAL IMAGES FIRST
        # ====================================================

        # Fail before modifying PostgreSQL or Storage if a local
        # source image is unexpectedly missing.

        for row in source_rows[
            "product_images"
        ]:

            local_image_path(
                row[
                    "image_url"
                ]
            )


        # ====================================================
        # CHECK DESTINATION
        # ====================================================

        # Psycopg automatically begins a transaction when the
        # SELECT COUNT(*) queries above are executed.
        #
        # In the old migration script, with postgres.transaction()
        # was entered while this implicit transaction was already
        # active. That caused the migration block to behave like a
        # nested transaction/savepoint rather than the outer
        # transaction.
        #
        # Verification could therefore see the inserted rows, but
        # closing the PostgreSQL connection later rolled back the
        # still-open outer transaction.
        #
        # End the preliminary read-only transaction here BEFORE
        # entering the real migration transaction.

        ensure_destination_is_empty(
            postgres
        )

        postgres.rollback()

        print(
            "\nSupabase tables are empty: OK"
        )


        image_url_map: dict[
            str,
            str,
        ] = {}


        # ====================================================
        # REAL POSTGRESQL TRANSACTION
        # ====================================================

        # This is now a TOP-LEVEL transaction.
        #
        # Normal exit:
        #     COMMIT
        #
        # Any exception:
        #     ROLLBACK

        with postgres.transaction():

            # ================================================
            # PRODUCTS
            # ================================================

            print(
                "\nMigrating products..."
            )

            for row in source_rows[
                "products"
            ]:

                insert_product(
                    postgres,
                    row,
                )


            # ================================================
            # PRODUCT IMAGES / STORAGE
            # ================================================

            print(
                "Synchronizing product images "
                "to Supabase Storage..."
            )

            for row in source_rows[
                "product_images"
            ]:

                old_image_url = (
                    row[
                        "image_url"
                    ]
                )

                (
                    storage_path,
                    new_image_url,
                ) = upload_local_image(
                    supabase.storage,
                    int(
                        row[
                            "product_id"
                        ]
                    ),
                    old_image_url,
                )

                synced_storage_paths.append(
                    storage_path
                )

                image_url_map[
                    old_image_url
                ] = new_image_url

                insert_product_image(
                    postgres,
                    row,
                    new_image_url,
                    storage_path,
                )


            # ================================================
            # ORDERS
            # ================================================

            print(
                "Migrating orders..."
            )

            for row in source_rows[
                "orders"
            ]:

                insert_order(
                    postgres,
                    row,
                )


            # ================================================
            # ORDER ITEMS
            # ================================================

            print(
                "Migrating order items..."
            )

            for row in source_rows[
                "order_items"
            ]:

                insert_order_item(
                    postgres,
                    row,
                    image_url_map,
                )


            # ================================================
            # NEWSLETTER
            # ================================================

            print(
                "Migrating newsletter subscribers..."
            )

            for row in source_rows[
                "newsletter_subscribers"
            ]:

                insert_newsletter_subscriber(
                    postgres,
                    row,
                )


            # ================================================
            # RESET IDENTITY SEQUENCES
            # ================================================

            for table in TABLES:

                reset_identity_sequence(
                    postgres,
                    table,
                )


            # ================================================
            # VERIFY BEFORE COMMIT
            # ================================================

            # Verification is deliberately inside the same
            # transaction.
            #
            # If any count is wrong, verify_counts() raises an
            # exception and PostgreSQL automatically rolls back
            # the entire migration.

            verify_counts(
                postgres,
                source_counts,
            )


        # ====================================================
        # COMMIT SUCCESS
        # ====================================================

        # Reaching this point means the with postgres.transaction()
        # block exited normally and PostgreSQL COMMITTED the data.

        print(
            "\nMIGRATION COMPLETE"
        )

        print(
            "Storage images synchronized: "
            f"{len(synced_storage_paths)}"
        )

        print(
            "PostgreSQL transaction "
            "committed successfully."
        )

        print(
            "All local IDs were preserved."
        )

        print(
            "Your local elio.db and uploads "
            "folder were not modified."
        )


    # ========================================================
    # FAILURE
    # ========================================================

    except Exception:

        try:
            postgres.rollback()

        except Exception:
            pass


        # Do NOT delete Storage objects automatically.
        #
        # The five original images already exist from the first
        # migration attempt. Because this migration uses deterministic
        # paths and upsert=true, leaving Storage objects in place makes
        # retries safe.
        #
        # Automatic cleanup here could accidentally delete valid
        # previously-uploaded ELIO images.

        if synced_storage_paths:

            print(
                "\nMigration failed after "
                "synchronizing Storage objects."
            )

            print(
                "Storage objects were left "
                "in place intentionally."
            )

            print(
                "A retry will safely "
                "overwrite/reuse the same paths."
            )

        raise


    # ========================================================
    # CLEANUP
    # ========================================================

    finally:

        sqlite_db.close()

        postgres.close()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()