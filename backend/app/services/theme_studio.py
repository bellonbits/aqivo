"""Theme Management & Code Editing Studio Service.
Provides secure, isolated admin-only management for storefront templates,
including draft workspaces, syntax validation, version snapshots, diff comparisons,
publishing workflows, and live preview rendering.
"""
import difflib
import json
import os
import re
import shutil
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Business, Template, User, Website
from app.services.audit import audit

TEMPLATES_ROOT = Path(__file__).resolve().parent.parent / "public" / "ecomm_templates"
STORAGE_ROOT = Path(get_settings().media_dir) / "theme_studio"
DRAFTS_ROOT = STORAGE_ROOT / "drafts"
VERSIONS_ROOT = STORAGE_ROOT / "versions"
BACKUPS_ROOT = STORAGE_ROOT / "backups"

ALLOWED_EXTENSIONS = {
    ".html", ".htm", ".css", ".js", ".mjs", ".json",
    ".svg", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp"
}

EDITABLE_EXTENSIONS = {".html", ".htm", ".css", ".js", ".mjs", ".json", ".svg", ".txt", ".md"}


def _ensure_dirs():
    DRAFTS_ROOT.mkdir(parents=True, exist_ok=True)
    VERSIONS_ROOT.mkdir(parents=True, exist_ok=True)
    BACKUPS_ROOT.mkdir(parents=True, exist_ok=True)


def safe_path(base_dir: Path, rel_path: str) -> Path:
    """Strictly validates relative path and prevents any directory traversal attacks."""
    cleaned = rel_path.strip().lstrip("/\\")
    normalized = os.path.normpath(cleaned)
    if not normalized or normalized.startswith("..") or "/../" in normalized or "\\..\\" in normalized:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid file path: path traversal is prohibited.")

    target = (base_dir / normalized).resolve()
    base_resolved = base_dir.resolve()
    try:
        target.relative_to(base_resolved)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid file path: outside template boundary.")

    ext = target.suffix.lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Forbidden file extension: '{ext}' is not permitted.")

    return target


def get_template_dir(theme_key: str) -> Path:
    key = theme_key.strip().lower()
    t_dir = TEMPLATES_ROOT / key
    if not t_dir.is_dir():
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Theme template '{theme_key}' does not exist.")
    return t_dir


def get_draft_dir(theme_key: str, create: bool = False) -> Path:
    key = theme_key.strip().lower()
    d_dir = DRAFTS_ROOT / key
    if create:
        d_dir.mkdir(parents=True, exist_ok=True)
    return d_dir


def ensure_theme_json(theme_key: str, db: Session | None = None) -> Path:
    """Ensures theme.json exists in template directory with design tokens."""
    t_dir = get_template_dir(theme_key)
    json_path = t_dir / "theme.json"
    if not json_path.exists():
        tokens = {
            "accent": "#5B21F5",
            "bg": "#FFFFFF",
            "ink": "#0B1736",
            "surface": "#F8FAFC",
            "border": "#E2E8F0",
            "radius": "12px",
            "font_display": "'Inter', system-ui, sans-serif",
            "font_body": "'Inter', system-ui, sans-serif",
            "hero_layout": "split",
            "sections": ["hero", "category_grid", "product_grid", "why_us", "reviews", "contact"]
        }
        if db:
            tpl = db.scalar(select(Template).where(Template.key == theme_key))
            if tpl and tpl.theme:
                tokens.update(tpl.theme)
                if tpl.default_sections:
                    tokens["sections"] = tpl.default_sections
        json_path.write_text(json.dumps(tokens, indent=2), encoding="utf-8")
    return json_path


def list_all_themes(db: Session) -> list[dict]:
    """Lists all templates with publication status, active storefront counts, and draft indicators."""
    _ensure_dirs()
    templates = db.scalars(select(Template).order_by(Template.name)).all()
    results = []
    for t in templates:
        t_dir = TEMPLATES_ROOT / t.key
        d_dir = DRAFTS_ROOT / t.key

        # Count active stores using this template
        stores_count = db.scalar(
            select(func.count(Website.id)).where(Website.template_id == t.id)
        ) or 0

        # Check for uncommitted draft files
        has_draft = False
        draft_files = []
        if d_dir.is_dir():
            for p in d_dir.rglob("*"):
                if p.is_file():
                    has_draft = True
                    draft_files.append(str(p.relative_to(d_dir)))

        # Count total published files
        files_count = 0
        if t_dir.is_dir():
            files_count = sum(1 for p in t_dir.rglob("*") if p.is_file())

        # Read latest version manifest if present
        v_dir = VERSIONS_ROOT / t.key
        latest_version = None
        if v_dir.is_dir():
            manifests = sorted(v_dir.glob("*/manifest.json"), key=lambda m: m.stat().st_mtime, reverse=True)
            if manifests:
                try:
                    latest_version = json.loads(manifests[0].read_text())
                except Exception:
                    pass

        results.append({
            "id": str(t.id),
            "key": t.key,
            "name": t.name,
            "industry": t.industry,
            "description": t.description,
            "features": t.features or [],
            "theme": t.theme or {},
            "is_active": t.is_active,
            "stores_count": stores_count,
            "files_count": files_count,
            "has_draft": has_draft,
            "draft_files_count": len(draft_files),
            "latest_version": latest_version.get("version_num") if latest_version else "v1.0.0",
            "last_published_at": latest_version.get("created_at") if latest_version else (t.updated_at.isoformat() if t.updated_at else None)
        })
    return results


def get_theme_file_tree(theme_key: str, db: Session | None = None) -> dict:
    """Returns the structured file tree of a theme, highlighting drafts and categories."""
    t_dir = get_template_dir(theme_key)
    d_dir = get_draft_dir(theme_key, create=False)
    ensure_theme_json(theme_key, db)

    files_map: dict[str, dict] = {}

    # Scan published files
    for p in t_dir.rglob("*"):
        if p.is_file():
            rel = str(p.relative_to(t_dir)).replace("\\", "/")
            ext = p.suffix.lower()
            files_map[rel] = {
                "path": rel,
                "name": p.name,
                "extension": ext,
                "size": p.stat().st_size,
                "modified_at": datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat(),
                "is_editable": ext in EDITABLE_EXTENSIONS,
                "has_draft": False,
                "is_new_in_draft": False
            }

    # Scan draft overrides
    if d_dir.is_dir():
        for dp in d_dir.rglob("*"):
            if dp.is_file():
                rel = str(dp.relative_to(d_dir)).replace("\\", "/")
                ext = dp.suffix.lower()
                is_new = rel not in files_map
                files_map[rel] = {
                    "path": rel,
                    "name": dp.name,
                    "extension": ext,
                    "size": dp.stat().st_size,
                    "modified_at": datetime.fromtimestamp(dp.stat().st_mtime, tz=timezone.utc).isoformat(),
                    "is_editable": ext in EDITABLE_EXTENSIONS,
                    "has_draft": True,
                    "is_new_in_draft": is_new
                }

    # Group into clean categories for Monaco left explorer
    templates = []
    styles = []
    scripts = []
    configs = []
    assets = []

    for path, meta in sorted(files_map.items()):
        if path.endswith(".html") or path.endswith(".htm"):
            templates.append(meta)
        elif path.endswith(".css"):
            styles.append(meta)
        elif path.endswith(".js") or path.endswith(".mjs"):
            scripts.append(meta)
        elif path.endswith(".json"):
            configs.append(meta)
        else:
            assets.append(meta)

    # Read current theme tokens from theme.json (preferring draft if present)
    theme_tokens = {}
    draft_theme_json = d_dir / "theme.json" if d_dir.is_dir() else None
    pub_theme_json = t_dir / "theme.json"
    active_json_path = draft_theme_json if (draft_theme_json and draft_theme_json.exists()) else pub_theme_json
    if active_json_path and active_json_path.exists():
        try:
            theme_tokens = json.loads(active_json_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    return {
        "theme_key": theme_key,
        "files": list(files_map.values()),
        "categories": {
            "templates": templates,
            "styles": styles,
            "scripts": scripts,
            "config": configs,
            "assets": assets
        },
        "theme_tokens": theme_tokens
    }


def read_theme_file(theme_key: str, rel_path: str, source: str = "draft", db: Session | None = None) -> dict:
    """Reads a file's content, draft status, and published counter-part for diffing."""
    t_dir = get_template_dir(theme_key)
    d_dir = get_draft_dir(theme_key, create=False)
    ensure_theme_json(theme_key, db)

    pub_file = safe_path(t_dir, rel_path)
    draft_file = safe_path(d_dir, rel_path) if d_dir.is_dir() else None

    published_content = pub_file.read_text(encoding="utf-8") if pub_file.is_file() else None

    has_draft = bool(draft_file and draft_file.is_file())
    draft_content = draft_file.read_text(encoding="utf-8") if has_draft else published_content

    if source == "published":
        active_content = published_content if published_content is not None else draft_content
    else:
        active_content = draft_content if draft_content is not None else published_content

    ext = Path(rel_path).suffix.lower()
    lang_map = {
        ".html": "html", ".htm": "html",
        ".css": "css",
        ".js": "javascript", ".mjs": "javascript",
        ".json": "json",
        ".svg": "xml",
        ".md": "markdown"
    }

    return {
        "path": rel_path.replace("\\", "/"),
        "language": lang_map.get(ext, "plaintext"),
        "content": active_content or "",
        "published_content": published_content or "",
        "has_draft": has_draft,
        "is_dirty": (draft_content != published_content) if (draft_content is not None and published_content is not None) else False,
        "size": len(active_content.encode("utf-8")) if active_content else 0
    }


def save_draft_file(theme_key: str, rel_path: str, content: str, user: User, db: Session) -> dict:
    """Saves edits strictly into the isolated draft workspace without touching live storefronts."""
    _ensure_dirs()
    d_dir = get_draft_dir(theme_key, create=True)
    draft_path = safe_path(d_dir, rel_path)
    draft_path.parent.mkdir(parents=True, exist_ok=True)

    # Validate json format if editing theme.json
    if draft_path.name == "theme.json":
        try:
            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                raise ValueError("theme.json must be a JSON object")
        except Exception as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid JSON syntax in theme.json: {str(e)}")

    draft_path.write_text(content, encoding="utf-8")
    audit(db, "admin.theme_draft_save", user_id=user.id, resource_type="theme", resource_id=theme_key,
          meta={"file": rel_path, "bytes": len(content)})
    db.commit()

    return {
        "success": True,
        "path": rel_path.replace("\\", "/"),
        "size": len(content.encode("utf-8")),
        "saved_at": datetime.now(timezone.utc).isoformat()
    }


def create_theme_file(theme_key: str, rel_path: str, content: str = "", user: User = None, db: Session = None) -> dict:
    """Creates a new editable file inside the theme draft."""
    _ensure_dirs()
    d_dir = get_draft_dir(theme_key, create=True)
    draft_path = safe_path(d_dir, rel_path)
    draft_path.parent.mkdir(parents=True, exist_ok=True)
    if draft_path.exists():
        raise HTTPException(status.HTTP_409_CONFLICT, f"File '{rel_path}' already exists.")

    default_content = content
    if not default_content:
        ext = draft_path.suffix.lower()
        if ext == ".html":
            default_content = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Page</title>\n</head>\n<body>\n  <main></main>\n</body>\n</html>\n"
        elif ext == ".css":
            default_content = "/* Theme custom stylesheet */\n"
        elif ext == ".js":
            default_content = "// Theme custom script\n(function() {\n  'use strict';\n})();\n"
        elif ext == ".json":
            default_content = "{}\n"

    draft_path.write_text(default_content, encoding="utf-8")
    if db and user:
        audit(db, "admin.theme_file_create", user_id=user.id, resource_type="theme", resource_id=theme_key,
              meta={"file": rel_path})
        db.commit()

    return {
        "success": True,
        "path": rel_path.replace("\\", "/"),
        "size": len(default_content)
    }


def delete_theme_file(theme_key: str, rel_path: str, user: User, db: Session) -> dict:
    """Removes a file from draft. Cannot delete core essential template files."""
    core_files = {"index.html", "cart.html", "checkout.html", "receipt.html", "theme.json"}
    if rel_path in core_files:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot delete core required file '{rel_path}'.")

    d_dir = get_draft_dir(theme_key, create=False)
    if d_dir.is_dir():
        draft_path = safe_path(d_dir, rel_path)
        if draft_path.is_file():
            draft_path.unlink()

    audit(db, "admin.theme_file_delete", user_id=user.id, resource_type="theme", resource_id=theme_key,
          meta={"file": rel_path})
    db.commit()
    return {"success": True, "deleted": rel_path}


def validate_theme_code(theme_key: str) -> dict:
    """Comprehensive syntax & structural validation across all draft/published files."""
    t_dir = get_template_dir(theme_key)
    d_dir = get_draft_dir(theme_key, create=False)

    errors = []
    warnings = []
    files_checked = 0

    # Collect active files (draft taking priority over published)
    all_rel_paths = set()
    for p in t_dir.rglob("*"):
        if p.is_file():
            all_rel_paths.add(str(p.relative_to(t_dir)).replace("\\", "/"))
    if d_dir.is_dir():
        for p in d_dir.rglob("*"):
            if p.is_file():
                all_rel_paths.add(str(p.relative_to(d_dir)).replace("\\", "/"))

    for rel in sorted(all_rel_paths):
        ext = Path(rel).suffix.lower()
        if ext not in EDITABLE_EXTENSIONS:
            continue

        files_checked += 1
        # Read active content
        draft_p = d_dir / rel if d_dir.is_dir() else None
        pub_p = t_dir / rel
        content = ""
        if draft_p and draft_p.is_file():
            content = draft_p.read_text(encoding="utf-8")
        elif pub_p and pub_p.is_file():
            content = pub_p.read_text(encoding="utf-8")

        # 1. HTML validation
        if ext in (".html", ".htm"):
            # Check balanced script tags
            open_scripts = len(re.findall(r"<script\b", content, re.I))
            close_scripts = len(re.findall(r"</script>", content, re.I))
            if open_scripts != close_scripts:
                errors.append({
                    "file": rel,
                    "line": 1,
                    "severity": "error",
                    "message": f"Mismatched <script> tags: found {open_scripts} opening vs {close_scripts} closing tags."
                })

            # Check balanced style tags
            open_styles = len(re.findall(r"<style\b", content, re.I))
            close_styles = len(re.findall(r"</style>", content, re.I))
            if open_styles != close_styles:
                errors.append({
                    "file": rel,
                    "line": 1,
                    "severity": "error",
                    "message": f"Mismatched <style> tags: found {open_styles} opening vs {close_styles} closing tags."
                })

            # Check required structure on index.html
            if rel == "index.html":
                if "<head>" not in content or "</head>" not in content:
                    warnings.append({
                        "file": rel,
                        "line": 1,
                        "severity": "warning",
                        "message": "Missing standard <head> section. Aqivo injects dynamic SEO and store context into <head>."
                    })
                if "<body" not in content:
                    errors.append({
                        "file": rel,
                        "line": 1,
                        "severity": "error",
                        "message": "Missing <body> tag in index.html template."
                    })

        # 2. CSS validation
        elif ext == ".css":
            open_braces = content.count("{")
            close_braces = content.count("}")
            if open_braces != close_braces:
                errors.append({
                    "file": rel,
                    "line": 1,
                    "severity": "error",
                    "message": f"Unbalanced CSS braces: {open_braces} '{{' and {close_braces} '}}'."
                })
            if "/*" in content and "*/" not in content:
                errors.append({
                    "file": rel,
                    "line": 1,
                    "severity": "error",
                    "message": "Unterminated CSS comment '/*'."
                })

        # 3. JavaScript validation
        elif ext in (".js", ".mjs"):
            # Basic syntactic balance checks
            if content.count("{") != content.count("}"):
                warnings.append({
                    "file": rel,
                    "line": 1,
                    "severity": "warning",
                    "message": "Unbalanced curly brackets '{' / '}' in JavaScript code."
                })
            if content.count("(") != content.count(")"):
                warnings.append({
                    "file": rel,
                    "line": 1,
                    "severity": "warning",
                    "message": "Unbalanced parentheses '(' / ')' in JavaScript code."
                })

        # 4. JSON validation
        elif ext == ".json":
            try:
                parsed = json.loads(content)
                if rel == "theme.json":
                    if not isinstance(parsed, dict):
                        errors.append({"file": rel, "line": 1, "severity": "error", "message": "theme.json must be a JSON object."})
                    elif "accent" not in parsed:
                        warnings.append({"file": rel, "line": 1, "severity": "warning", "message": "theme.json recommended token 'accent' color is missing."})
            except json.JSONDecodeError as err:
                errors.append({
                    "file": rel,
                    "line": err.lineno,
                    "severity": "error",
                    "message": f"JSON syntax error: {err.msg} at line {err.lineno}:{err.colno}"
                })

    is_valid = len(errors) == 0
    return {
        "valid": is_valid,
        "files_checked": files_checked,
        "errors": errors,
        "warnings": warnings,
        "summary": "All theme files passed syntax and structural validation!" if is_valid else f"Validation failed with {len(errors)} error(s)."
    }


def get_theme_diff_summary(theme_key: str) -> dict:
    """Generates a line-by-line unified diff between published files and draft modifications."""
    t_dir = get_template_dir(theme_key)
    d_dir = get_draft_dir(theme_key, create=False)

    if not d_dir.is_dir():
        return {"total_files_changed": 0, "additions": 0, "deletions": 0, "files": []}

    diffs = []
    total_adds = 0
    total_dels = 0

    for dp in sorted(d_dir.rglob("*")):
        if dp.is_file():
            rel = str(dp.relative_to(d_dir)).replace("\\", "/")
            draft_text = dp.read_text(encoding="utf-8")
            pub_p = t_dir / rel
            if pub_p.is_file():
                pub_text = pub_p.read_text(encoding="utf-8")
                status_str = "modified" if draft_text != pub_text else "unchanged"
            else:
                pub_text = ""
                status_str = "added"

            if status_str != "unchanged":
                pub_lines = pub_text.splitlines(keepends=True)
                draft_lines = draft_text.splitlines(keepends=True)
                diff_gen = list(difflib.unified_diff(
                    pub_lines, draft_lines,
                    fromfile=f"published/{rel}",
                    tofile=f"draft/{rel}",
                    n=3
                ))
                diff_patch = "".join(diff_gen)
                adds = sum(1 for line in diff_gen if line.startswith("+") and not line.startswith("+++"))
                dels = sum(1 for line in diff_gen if line.startswith("-") and not line.startswith("---"))
                total_adds += adds
                total_dels += dels

                diffs.append({
                    "path": rel,
                    "status": status_str,
                    "additions": adds,
                    "deletions": dels,
                    "diff_patch": diff_patch,
                    "published_content": pub_text,
                    "draft_content": draft_text
                })

    return {
        "total_files_changed": len(diffs),
        "additions": total_adds,
        "deletions": total_dels,
        "files": diffs
    }


def publish_theme_changes(db: Session, theme_key: str, user: User, notes: str = "") -> dict:
    """Takes a backup snapshot version, applies draft files directly into live ecomm_templates, and updates DB."""
    _ensure_dirs()
    t_dir = get_template_dir(theme_key)
    d_dir = get_draft_dir(theme_key, create=False)

    if not d_dir.is_dir() or not any(d_dir.rglob("*")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No draft modifications found to publish.")

    # 1. Validation check before publishing
    val = validate_theme_code(theme_key)
    if not val["valid"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot publish: {len(val['errors'])} syntax error(s) must be resolved first.")

    # 2. Compute diff stats before copying
    diff_stats = get_theme_diff_summary(theme_key)

    # 3. Create historical snapshot version
    v_key_dir = VERSIONS_ROOT / theme_key
    v_key_dir.mkdir(parents=True, exist_ok=True)
    existing_versions = sorted([p for p in v_key_dir.iterdir() if p.is_dir()], key=lambda p: p.stat().st_mtime)
    version_num = f"v{len(existing_versions) + 1}.0"
    v_id = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
    snapshot_dir = v_key_dir / v_id
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    # Copy current published state as snapshot backup
    shutil.copytree(t_dir, snapshot_dir / "files", dirs_exist_ok=True)

    manifest = {
        "version_id": v_id,
        "version_num": version_num,
        "theme_key": theme_key,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.email,
        "notes": notes or f"Published update {version_num}",
        "files_changed": diff_stats["total_files_changed"],
        "additions": diff_stats["additions"],
        "deletions": diff_stats["deletions"]
    }
    (snapshot_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # 4. Deploy draft files into published TEMPLATES_ROOT
    shutil.copytree(d_dir, t_dir, dirs_exist_ok=True)

    # 5. Sync theme.json into DB Template row if updated
    theme_json_p = t_dir / "theme.json"
    if theme_json_p.exists():
        try:
            tokens = json.loads(theme_json_p.read_text(encoding="utf-8"))
            tpl = db.scalar(select(Template).where(Template.key == theme_key))
            if tpl:
                tpl.theme = tokens
                if "sections" in tokens:
                    tpl.default_sections = tokens["sections"]
                db.commit()
        except Exception:
            pass

    # 6. Clear draft directory after successful deployment
    shutil.rmtree(d_dir, ignore_errors=True)

    # 7. Audit log
    audit(db, "admin.theme_publish", user_id=user.id, resource_type="theme", resource_id=theme_key,
          meta={"version": version_num, "notes": notes, "files_changed": diff_stats["total_files_changed"]})
    db.commit()

    return {
        "success": True,
        "version_id": v_id,
        "version_num": version_num,
        "published_at": manifest["created_at"],
        "files_changed": diff_stats["total_files_changed"]
    }


def list_theme_versions(theme_key: str) -> list[dict]:
    """Retrieves all published version snapshots for rollback and history audit."""
    _ensure_dirs()
    v_key_dir = VERSIONS_ROOT / theme_key
    if not v_key_dir.is_dir():
        return []

    versions = []
    for snapshot_dir in sorted(v_key_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if snapshot_dir.is_dir():
            m_path = snapshot_dir / "manifest.json"
            if m_path.exists():
                try:
                    versions.append(json.loads(m_path.read_text()))
                except Exception:
                    pass
    return versions


def rollback_theme_version(db: Session, theme_key: str, version_id: str, user: User) -> dict:
    """Restores files from a previous snapshot version back into live templates."""
    _ensure_dirs()
    t_dir = get_template_dir(theme_key)
    snapshot_dir = VERSIONS_ROOT / theme_key / version_id
    files_dir = snapshot_dir / "files"
    if not files_dir.is_dir():
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Version snapshot '{version_id}' not found.")

    # Safety backup of current state
    safety_backup = BACKUPS_ROOT / theme_key / f"pre_rollback_{int(time.time())}"
    shutil.copytree(t_dir, safety_backup, dirs_exist_ok=True)

    # Restore snapshot into published directory
    shutil.copytree(files_dir, t_dir, dirs_exist_ok=True)

    # Clear drafts to prevent collisions
    d_dir = get_draft_dir(theme_key, create=False)
    if d_dir.is_dir():
        shutil.rmtree(d_dir, ignore_errors=True)

    # Sync theme.json to DB
    theme_json_p = t_dir / "theme.json"
    if theme_json_p.exists():
        try:
            tokens = json.loads(theme_json_p.read_text(encoding="utf-8"))
            tpl = db.scalar(select(Template).where(Template.key == theme_key))
            if tpl:
                tpl.theme = tokens
                db.commit()
        except Exception:
            pass

    audit(db, "admin.theme_rollback", user_id=user.id, resource_type="theme", resource_id=theme_key,
          meta={"restored_version": version_id})
    db.commit()

    return {
        "success": True,
        "restored_version": version_id,
        "restored_at": datetime.now(timezone.utc).isoformat()
    }


def create_theme(db: Session, key: str, name: str, industry: str, description: str, clone_from: str | None, user: User) -> dict:
    """Creates a new theme either from a starter template or cloned from an existing theme."""
    _ensure_dirs()
    clean_key = re.sub(r"[^a-z0-9_-]", "", key.strip().lower())
    if not clean_key or len(clean_key) < 3:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Theme key must be at least 3 alphanumeric characters.")

    existing_tpl = db.scalar(select(Template).where(Template.key == clean_key))
    target_dir = TEMPLATES_ROOT / clean_key
    if existing_tpl or target_dir.exists():
        raise HTTPException(status.HTTP_409_CONFLICT, f"Theme with key '{clean_key}' already exists.")

    target_dir.mkdir(parents=True, exist_ok=True)

    if clone_from:
        src_dir = get_template_dir(clone_from)
        shutil.copytree(src_dir, target_dir, dirs_exist_ok=True)
    else:
        # Base starter template files
        (target_dir / "styles").mkdir(exist_ok=True)
        (target_dir / "scripts").mkdir(exist_ok=True)

        starter_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{name}</title>
  <link rel="stylesheet" href="styles/mobile-store.css">
</head>
<body class="bg-white text-slate-900 font-sans">
  <header class="p-4 border-b flex justify-between items-center">
    <h1 class="text-xl font-bold">{name}</h1>
    <a href="cart.html" class="px-3 py-1.5 rounded-lg bg-black text-white text-sm font-semibold">Cart</a>
  </header>
  <main class="max-w-4xl mx-auto p-6">
    <section class="py-12 text-center">
      <h2 class="text-3xl font-extrabold">{name} Online Store</h2>
      <p class="mt-2 text-slate-600">{description or 'Browse catalogue and place your order online.'}</p>
    </section>
    <section id="products-grid" class="grid gap-6 grid-cols-2 md:grid-cols-3">
      <!-- Injected products by Aqivo bridge -->
    </section>
  </main>
  <script src="_bridge.js"></script>
  <script src="scripts/mobile-store.js"></script>
</body>
</html>"""
        (target_dir / "index.html").write_text(starter_html, encoding="utf-8")
        (target_dir / "product.html").write_text(starter_html, encoding="utf-8")
        (target_dir / "cart.html").write_text(starter_html, encoding="utf-8")
        (target_dir / "checkout.html").write_text(starter_html, encoding="utf-8")
        (target_dir / "receipt.html").write_text(starter_html, encoding="utf-8")
        (target_dir / "styles" / "mobile-store.css").write_text("/* Storefront responsive styles */\n:root { --accent: #5B21F5; }\n", encoding="utf-8")
        (target_dir / "scripts" / "mobile-store.js").write_text("// Storefront interactive behavior\n", encoding="utf-8")

    new_tokens = {
        "accent": "#5B21F5",
        "bg": "#FFFFFF",
        "ink": "#0B1736",
        "radius": "12px",
        "font_display": "'Inter', system-ui, sans-serif",
        "font_body": "'Inter', system-ui, sans-serif"
    }
    (target_dir / "theme.json").write_text(json.dumps(new_tokens, indent=2), encoding="utf-8")

    # Add to database
    new_tpl = Template(
        key=clean_key,
        name=name.strip(),
        industry=industry.strip().lower() or "retail",
        description=description.strip(),
        features=["Online Orders", "Catalogue", "Cart", "Checkout"],
        default_sections=["hero", "category_grid", "product_grid", "reviews", "contact"],
        theme=new_tokens,
        is_active=True
    )
    db.add(new_tpl)
    audit(db, "admin.theme_create", user_id=user.id, resource_type="theme", resource_id=clean_key,
          meta={"name": name, "industry": industry, "cloned_from": clone_from})
    db.commit()

    return {
        "key": clean_key,
        "name": name,
        "industry": industry,
        "created_at": datetime.now(timezone.utc).isoformat()
    }


def duplicate_theme(db: Session, source_key: str, new_key: str, new_name: str, user: User) -> dict:
    src_tpl = db.scalar(select(Template).where(Template.key == source_key))
    if not src_tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Source theme '{source_key}' not found.")

    return create_theme(
        db=db,
        key=new_key,
        name=new_name,
        industry=src_tpl.industry,
        description=f"Duplicate of {src_tpl.name}. {src_tpl.description}",
        clone_from=source_key,
        user=user
    )


def update_theme_metadata(db: Session, theme_key: str, data: dict, user: User) -> dict:
    tpl = db.scalar(select(Template).where(Template.key == theme_key))
    if not tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Theme '{theme_key}' not found.")

    if "name" in data and data["name"]:
        tpl.name = data["name"].strip()
    if "industry" in data and data["industry"]:
        tpl.industry = data["industry"].strip()
    if "description" in data:
        tpl.description = data["description"].strip()
    if "features" in data and isinstance(data["features"], list):
        tpl.features = data["features"]
    if "is_active" in data:
        tpl.is_active = bool(data["is_active"])
    if "theme" in data and isinstance(data["theme"], dict):
        tpl.theme = {**(tpl.theme or {}), **data["theme"]}
        # Also sync to draft theme.json
        d_dir = get_draft_dir(theme_key, create=True)
        (d_dir / "theme.json").write_text(json.dumps(tpl.theme, indent=2), encoding="utf-8")

    audit(db, "admin.theme_update", user_id=user.id, resource_type="theme", resource_id=theme_key, meta=data)
    db.commit()
    return {"key": tpl.key, "name": tpl.name, "is_active": tpl.is_active, "theme": tpl.theme}


def delete_theme(db: Session, theme_key: str, user: User) -> dict:
    tpl = db.scalar(select(Template).where(Template.key == theme_key))
    if not tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Theme '{theme_key}' not found.")

    # Guard: Cannot delete if businesses currently rely on this template
    stores_count = db.scalar(select(func.count(Website.id)).where(Website.template_id == tpl.id)) or 0
    if stores_count > 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot delete theme '{tpl.name}' because {stores_count} live storefront(s) are currently using it. Please switch those stores to another theme or archive this theme instead."
        )

    t_dir = TEMPLATES_ROOT / theme_key
    # Move to backup archive instead of destroying
    if t_dir.is_dir():
        backup_dir = BACKUPS_ROOT / theme_key / f"deleted_{int(time.time())}"
        backup_dir.mkdir(parents=True, exist_ok=True)
        shutil.move(str(t_dir), str(backup_dir / theme_key))

    # Clear drafts
    d_dir = DRAFTS_ROOT / theme_key
    if d_dir.is_dir():
        shutil.rmtree(d_dir, ignore_errors=True)

    db.delete(tpl)
    audit(db, "admin.theme_delete", user_id=user.id, resource_type="theme", resource_id=theme_key, meta={"name": tpl.name})
    db.commit()

    return {"success": True, "deleted": theme_key}
