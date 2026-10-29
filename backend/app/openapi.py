"""OpenAPI document generation for the registered Flask routes."""

from __future__ import annotations

import re
from typing import Any


_PATH_PARAMETER_PATTERN = re.compile(r"<(?:[^:>]+:)?([^>]+)>")


def _openapi_path(rule: str) -> str:
    return _PATH_PARAMETER_PATTERN.sub(r"{\1}", rule)


def _path_parameters(rule: str) -> list[dict[str, Any]]:
    parameters = []
    for name in _PATH_PARAMETER_PATTERN.findall(rule):
        parameters.append(
            {
                "name": name,
                "in": "path",
                "required": True,
                "schema": {"type": "integer" if "<int:" + name + ">" in rule else "string"},
            }
        )
    return parameters


def build_openapi_spec(app) -> dict[str, Any]:
    """Build a route-level OpenAPI document from Flask's URL map."""
    paths: dict[str, dict[str, Any]] = {}

    for rule in app.url_map.iter_rules():
        if not rule.rule.startswith("/api") or rule.rule in {"/api/docs", "/api/openapi.json"}:
            continue

        path = _openapi_path(rule.rule)
        path_item = paths.setdefault(path, {})
        tag = path.strip("/").split("/")[1].replace("-", " ").title()

        for method in sorted(rule.methods - {"HEAD", "OPTIONS"}):
            operation_id = f"{rule.endpoint.replace('.', '_')}_{method.lower()}"
            operation: dict[str, Any] = {
                "operationId": operation_id,
                "tags": [tag or "API"],
                "summary": f"{method.title()} {path}",
                "parameters": _path_parameters(rule.rule),
                "responses": {
                    "200": {"description": "Successful response"},
                    "400": {"description": "Validation error"},
                    "401": {"description": "Authentication required"},
                },
            }

            if method in {"POST", "PUT", "PATCH"}:
                operation["requestBody"] = {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"type": "object", "additionalProperties": True}
                        }
                    },
                }

            if path not in {"/api/auth/login", "/api/auth/refresh", "/api/health"}:
                operation["security"] = [{"bearerAuth": []}]

            path_item[method.lower()] = operation

    return {
        "openapi": "3.0.3",
        "info": {
            "title": "StockIt API",
            "version": "1.0.0",
            "description": "Inventory, sales, purchases, reports, and user management API.",
        },
        "servers": [{"url": "/"}],
        "tags": [
            {"name": "Auth", "description": "Authentication and profile operations"},
            {"name": "Products", "description": "Product and stock operations"},
            {"name": "Sales", "description": "Outgoing stock transactions"},
            {"name": "Purchases", "description": "Incoming stock transactions"},
        ],
        "components": {
            "securitySchemes": {
                "bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
            }
        },
        "paths": paths,
    }
