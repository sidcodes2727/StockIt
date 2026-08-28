"""Product CRUD, stock adjustments, low-stock listing and CSV import."""

from __future__ import annotations

import csv
import io
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from ..errors import ApiError, ConflictError, NotFoundError
from ..extensions import db
from ..models import Category, Product, Purchase, Sale, Supplier, UserRole
from ..schemas import (
    ProductCreateSchema,
    ProductSchema,
    ProductUpdateSchema,
    StockAdjustmentSchema,
)
from ..utils import (
    apply_sort,
    auth_required,
    generate_sku,
    paginate,
    role_required,
)

products_bp = Blueprint("products", __name__, url_prefix="/products")

product_schema = ProductSchema()

SORTABLE = {
    "name": Product.name,
    "sku": Product.sku,
    "quantity": Product.quantity,
    "unit_price": Product.unit_price,
    "cost_price": Product.cost_price,
    "reorder_level": Product.reorder_level,
    "created_at": Product.created_at,
    "updated_at": Product.updated_at,
}

# Reused by the products list, dashboard and low-stock report so the three can
# never disagree about what "low stock" means.
STOCK_STATUS_FILTERS = {
    "out_of_stock": Product.quantity <= 0,
    "low_stock": (Product.quantity > 0) & (Product.quantity <= Product.reorder_level),
    "in_stock": Product.quantity > Product.reorder_level,
}
NEEDS_REORDER = Product.quantity <= Product.reorder_level


def _get_or_404(product_id: int) -> Product:
    product = db.session.get(Product, product_id)
    if product is None:
        raise NotFoundError("That product does not exist.")
    return product


def _validate_relations(category_id: int | None, supplier_id: int | None) -> None:
    """Reject unknown FKs with a field-level message instead of a raw 409."""
    errors: dict[str, list[str]] = {}
    if category_id is not None and db.session.get(Category, category_id) is None:
        errors["category_id"] = ["That category does not exist."]
    if supplier_id is not None and db.session.get(Supplier, supplier_id) is None:
        errors["supplier_id"] = ["That supplier does not exist."]
    if errors:
        raise ApiError(
            "Some selections are no longer valid.",
            status_code=422,
            code="VALIDATION_ERROR",
            details=errors,
        )


def _assert_sku_available(sku: str, exclude_id: int | None = None) -> None:
    query = select(Product).where(func.lower(Product.sku) == sku.lower())
    if exclude_id is not None:
        query = query.where(Product.id != exclude_id)
    if db.session.scalar(query) is not None:
        raise ApiError(
            "That SKU is already in use.",
            status_code=422,
            code="VALIDATION_ERROR",
            details={"sku": ["That SKU is already in use."]},
        )


def _base_query():
    return select(Product).options(
        joinedload(Product.category), joinedload(Product.supplier)
    )


def _apply_filters(query):
    search = (request.args.get("search") or "").strip()
    if search:
        needle = f"%{search}%"
        query = query.where(
            or_(
                Product.name.ilike(needle),
                Product.sku.ilike(needle),
                Product.description.ilike(needle),
            )
        )

    category_id = request.args.get("category_id")
    if category_id and category_id != "all":
        try:
            query = query.where(Product.category_id == int(category_id))
        except ValueError:
            raise ApiError("`category_id` must be an integer.") from None

    supplier_id = request.args.get("supplier_id")
    if supplier_id and supplier_id != "all":
        try:
            query = query.where(Product.supplier_id == int(supplier_id))
        except ValueError:
            raise ApiError("`supplier_id` must be an integer.") from None

    status = request.args.get("stock_status")
    if status and status != "all":
        condition = STOCK_STATUS_FILTERS.get(status)
        if condition is None:
            raise ApiError(
                "`stock_status` must be one of: in_stock, low_stock, out_of_stock."
            )
        query = query.where(condition)

    return query


@products_bp.get("")
@auth_required
def list_products():
    query = apply_sort(_apply_filters(_base_query()), SORTABLE, default="name")

    if (request.args.get("paginate") or "").lower() == "false":
        products = db.session.scalars(query).unique().all()
        return {"items": product_schema.dump(products, many=True)}, 200

    return paginate(query, product_schema), 200


@products_bp.get("/low-stock")
@auth_required
def low_stock():
    """Products at or below their reorder level, most urgent first."""
    query = (
        _base_query()
        .where(NEEDS_REORDER)
        .order_by(Product.quantity.asc(), Product.name.asc())
    )

    limit = request.args.get("limit")
    if limit:
        try:
            products = db.session.scalars(query.limit(int(limit))).unique().all()
        except ValueError:
            raise ApiError("`limit` must be an integer.") from None
        return {"items": product_schema.dump(products, many=True)}, 200

    return paginate(query, product_schema), 200


@products_bp.get("/<int:product_id>")
@auth_required
def get_product(product_id: int):
    product = _get_or_404(product_id)

    recent_purchases = db.session.scalars(
        select(Purchase)
        .where(Purchase.product_id == product.id)
        .order_by(Purchase.purchase_date.desc(), Purchase.id.desc())
        .limit(5)
    ).all()
    recent_sales = db.session.scalars(
        select(Sale)
        .where(Sale.product_id == product.id)
        .order_by(Sale.sale_date.desc(), Sale.id.desc())
        .limit(5)
    ).all()

    units_sold = db.session.scalar(
        select(func.coalesce(func.sum(Sale.quantity), 0)).where(
            Sale.product_id == product.id
        )
    )

    return {
        "product": product_schema.dump(product),
        "stats": {
            "units_sold": int(units_sold or 0),
            "purchase_count": len(recent_purchases),
        },
        "recent_purchases": [
            {
                "id": p.id,
                "reference_no": p.reference_no,
                "quantity": p.quantity,
                "cost_price": float(p.cost_price),
                "purchase_date": p.purchase_date.isoformat(),
            }
            for p in recent_purchases
        ],
        "recent_sales": [
            {
                "id": s.id,
                "invoice_no": s.invoice_no,
                "quantity": s.quantity,
                "sale_price": float(s.sale_price),
                "sale_date": s.sale_date.isoformat(),
            }
            for s in recent_sales
        ],
    }, 200


@products_bp.post("")
@auth_required
def create_product():
    payload = ProductCreateSchema().load(request.get_json(silent=True) or {})
    _validate_relations(payload.get("category_id"), payload.get("supplier_id"))

    sku = (payload.get("sku") or "").strip()
    if sku:
        _assert_sku_available(sku)
    else:
        category = (
            db.session.get(Category, payload["category_id"])
            if payload.get("category_id")
            else None
        )
        sku = generate_sku(category.name if category else None)

    product = Product(
        name=payload["name"].strip(),
        sku=sku,
        category_id=payload.get("category_id"),
        supplier_id=payload.get("supplier_id"),
        unit_price=payload["unit_price"],
        cost_price=payload["cost_price"],
        quantity=payload["quantity"],
        reorder_level=payload["reorder_level"],
        description=(payload.get("description") or "").strip() or None,
        image_url=(payload.get("image_url") or "").strip() or None,
    )

    try:
        db.session.add(product)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    db.session.refresh(product)
    return {
        "product": product_schema.dump(product),
        "message": f'"{product.name}" added to inventory.',
    }, 201


@products_bp.put("/<int:product_id>")
@products_bp.patch("/<int:product_id>")
@auth_required
def update_product(product_id: int):
    product = _get_or_404(product_id)
    payload = ProductUpdateSchema().load(request.get_json(silent=True) or {})

    if "category_id" in payload or "supplier_id" in payload:
        _validate_relations(
            payload.get("category_id", product.category_id),
            payload.get("supplier_id", product.supplier_id),
        )

    if "sku" in payload:
        sku = payload["sku"].strip()
        _assert_sku_available(sku, exclude_id=product.id)
        product.sku = sku

    if "name" in payload:
        product.name = payload["name"].strip()
    for field in ("category_id", "supplier_id", "unit_price", "cost_price", "reorder_level"):
        if field in payload:
            setattr(product, field, payload[field])
    for field in ("description", "image_url"):
        if field in payload:
            value = payload[field]
            setattr(product, field, (value or "").strip() or None if value else None)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {
        "product": product_schema.dump(product),
        "message": f'"{product.name}" updated.',
    }, 200


@products_bp.post("/<int:product_id>/adjust-stock")
@auth_required
def adjust_stock(product_id: int):
    """Set stock to an absolute figure — for stock-takes, damage and shrinkage.

    Kept separate from the product update endpoint so that a routine price edit
    can never silently overwrite a stock level.
    """
    product = _get_or_404(product_id)
    payload = StockAdjustmentSchema().load(request.get_json(silent=True) or {})

    previous = product.quantity
    try:
        product.quantity = payload["quantity"]
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    delta = product.quantity - previous
    return {
        "product": product_schema.dump(product),
        "message": (
            f"Stock for \"{product.name}\" adjusted from {previous} to "
            f"{product.quantity} ({delta:+d})."
        ),
    }, 200


@products_bp.delete("/<int:product_id>")
@auth_required
def delete_product(product_id: int):
    """Delete a product.

    Purchase and sale rows are financial history, so a product carrying any is
    refused with a 409 that reports the counts. The frontend surfaces those in
    the confirmation dialog and retries with ``?force=true`` once the user has
    seen exactly what will be removed.
    """
    product = _get_or_404(product_id)
    force = (request.args.get("force") or "").lower() in {"1", "true", "yes"}

    purchase_count = db.session.scalar(
        select(func.count(Purchase.id)).where(Purchase.product_id == product.id)
    )
    sale_count = db.session.scalar(
        select(func.count(Sale.id)).where(Sale.product_id == product.id)
    )

    if (purchase_count or sale_count) and not force:
        raise ConflictError(
            f'"{product.name}" has transaction history and cannot be removed '
            "without also deleting it.",
            code="HAS_TRANSACTIONS",
            details={
                "purchase_count": int(purchase_count or 0),
                "sale_count": int(sale_count or 0),
                "hint": "Retry with ?force=true to delete the product and its history.",
            },
        )

    name = product.name
    try:
        db.session.delete(product)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"message": f'"{name}" deleted.'}, 200


# --------------------------------------------------------------------------- #
# CSV bulk import
# --------------------------------------------------------------------------- #
IMPORT_COLUMNS = (
    "name",
    "sku",
    "category",
    "supplier",
    "unit_price",
    "cost_price",
    "quantity",
    "reorder_level",
    "description",
)


def _to_decimal(raw: str | None, field: str, row_no: int) -> Decimal:
    if raw is None or str(raw).strip() == "":
        return Decimal("0.00")
    try:
        value = Decimal(str(raw).strip())
    except InvalidOperation:
        raise ValueError(f"row {row_no}: `{field}` is not a valid number") from None
    if value < 0:
        raise ValueError(f"row {row_no}: `{field}` cannot be negative")
    return value


def _to_int(raw: str | None, field: str, row_no: int) -> int:
    if raw is None or str(raw).strip() == "":
        return 0
    try:
        value = int(Decimal(str(raw).strip()))
    except (InvalidOperation, ValueError):
        raise ValueError(f"row {row_no}: `{field}` is not a valid whole number") from None
    if value < 0:
        raise ValueError(f"row {row_no}: `{field}` cannot be negative")
    return value


@products_bp.get("/import/template")
@auth_required
def import_template():
    """Download a CSV template with the expected header row."""
    from ..utils import csv_response

    return csv_response(
        "product-import-template.csv",
        IMPORT_COLUMNS,
        [
            (
                "Paracetamol 500mg",
                "MED-0001",
                "Medicines",
                "MedSupply Co",
                "45.00",
                "28.50",
                "120",
                "25",
                "Pack of 15 tablets",
            )
        ],
    )


@products_bp.post("/import")
@role_required(UserRole.ADMIN)
def import_products():
    """Bulk-create products from an uploaded CSV.

    Categories and suppliers referenced by name are created on the fly. The
    whole file is applied as one transaction: any failing row aborts the import
    so a partial catalogue is never committed.
    """
    upload = request.files.get("file")
    if upload is None or not upload.filename:
        raise ApiError(
            "Attach a CSV file in the `file` field.", code="FILE_REQUIRED"
        )
    if not upload.filename.lower().endswith(".csv"):
        raise ApiError("Only .csv files are supported.", code="UNSUPPORTED_FILE")

    try:
        # utf-8-sig strips the BOM Excel adds, which would otherwise corrupt the
        # first header name.
        text = upload.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        raise ApiError(
            "The file is not valid UTF-8 text. Re-export it as CSV UTF-8.",
            code="INVALID_ENCODING",
        ) from None

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or "name" not in {
        (f or "").strip().lower() for f in reader.fieldnames
    }:
        raise ApiError(
            "The CSV must include a `name` column. Download the template for the "
            "expected format.",
            code="INVALID_CSV",
        )

    category_cache: dict[str, Category] = {}
    supplier_cache: dict[str, Supplier] = {}
    created: list[Product] = []
    errors: list[str] = []
    seen_skus: set[str] = set()

    try:
        for row_no, raw_row in enumerate(reader, start=2):
            row = {
                (key or "").strip().lower(): (value or "").strip()
                for key, value in raw_row.items()
                if key
            }
            if not any(row.values()):
                continue

            name = row.get("name", "")
            if not name:
                errors.append(f"row {row_no}: `name` is required")
                continue

            try:
                unit_price = _to_decimal(row.get("unit_price"), "unit_price", row_no)
                cost_price = _to_decimal(row.get("cost_price"), "cost_price", row_no)
                quantity = _to_int(row.get("quantity"), "quantity", row_no)
                reorder_level = _to_int(row.get("reorder_level"), "reorder_level", row_no)
            except ValueError as exc:
                errors.append(str(exc))
                continue

            category = None
            category_name = row.get("category")
            if category_name:
                key = category_name.lower()
                if key not in category_cache:
                    found = db.session.scalar(
                        select(Category).where(
                            func.lower(Category.name) == key
                        )
                    )
                    if found is None:
                        found = Category(name=category_name)
                        db.session.add(found)
                        db.session.flush()
                    category_cache[key] = found
                category = category_cache[key]

            supplier = None
            supplier_name = row.get("supplier")
            if supplier_name:
                key = supplier_name.lower()
                if key not in supplier_cache:
                    found = db.session.scalar(
                        select(Supplier).where(func.lower(Supplier.name) == key)
                    )
                    if found is None:
                        found = Supplier(name=supplier_name)
                        db.session.add(found)
                        db.session.flush()
                    supplier_cache[key] = found
                supplier = supplier_cache[key]

            sku = row.get("sku") or ""
            if sku:
                if sku.lower() in seen_skus:
                    errors.append(f"row {row_no}: SKU `{sku}` is duplicated in the file")
                    continue
                clash = db.session.scalar(
                    select(Product.id).where(func.lower(Product.sku) == sku.lower())
                )
                if clash is not None:
                    errors.append(f"row {row_no}: SKU `{sku}` already exists")
                    continue
            else:
                sku = generate_sku(category.name if category else None)
                # generate_sku reads committed rows only, so track in-flight SKUs.
                while sku.lower() in seen_skus:
                    stem, _, tail = sku.rpartition("-")
                    sku = f"{stem}-{int(tail) + 1:04d}"
            seen_skus.add(sku.lower())

            product = Product(
                name=name,
                sku=sku,
                category_id=category.id if category else None,
                supplier_id=supplier.id if supplier else None,
                unit_price=unit_price,
                cost_price=cost_price,
                quantity=quantity,
                reorder_level=reorder_level,
                description=row.get("description") or None,
            )
            db.session.add(product)
            created.append(product)

        if errors:
            db.session.rollback()
            raise ApiError(
                f"Import aborted: {len(errors)} row(s) could not be processed. "
                "No products were created.",
                status_code=422,
                code="IMPORT_FAILED",
                details={"errors": errors[:50], "error_count": len(errors)},
            )

        if not created:
            db.session.rollback()
            raise ApiError(
                "The file contained no product rows.", code="EMPTY_CSV"
            )

        db.session.commit()
    except ApiError:
        raise
    except Exception:
        db.session.rollback()
        raise

    return {
        "message": f"Imported {len(created)} product(s).",
        "created_count": len(created),
        "categories_created": len(category_cache),
        "suppliers_created": len(supplier_cache),
    }, 201
