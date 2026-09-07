#!/usr/bin/env python3
import json
import os
import re
import sys

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    errors = []

    # 1. Check robots.txt (in public/ and repo root)
    for r_path in [os.path.join(repo_root, "public", "robots.txt"), os.path.join(repo_root, "robots.txt")]:
        if not os.path.exists(r_path):
            errors.append(f"Missing {r_path}")
        else:
            with open(r_path, "r", encoding="utf-8") as f:
                r_content = f.read()
            if "User-agent: *" not in r_content:
                errors.append(f"{r_path} missing 'User-agent: *'")
            if "Allow: /" not in r_content:
                errors.append(f"{r_path} missing 'Allow: /'")
            if "Sitemap: https://howlcipher.github.io/redistricting-map/sitemap.xml" not in r_content:
                errors.append(f"{r_path} missing correct Sitemap directive")

    # 2. Check sitemap.xml (in public/ and repo root)
    for s_path in [os.path.join(repo_root, "public", "sitemap.xml"), os.path.join(repo_root, "sitemap.xml")]:
        if not os.path.exists(s_path):
            errors.append(f"Missing {s_path}")
        else:
            with open(s_path, "r", encoding="utf-8") as f:
                s_content = f.read()
            locs = re.findall(r"<loc>(.*?)</loc>", s_content)
            if "https://howlcipher.github.io/redistricting-map/" not in locs:
                errors.append(f"{s_path} missing expected canonical URL")

    # 3. Check index.html
    index_path = os.path.join(repo_root, "index.html")
    if not os.path.exists(index_path):
        errors.append(f"Missing {index_path}")
    else:
        with open(index_path, "r", encoding="utf-8") as f:
            html = f.read()

        # Title
        title_m = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        if not title_m or not title_m.group(1).strip():
            errors.append("index.html missing <title>")

        # Meta description
        desc_m = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not desc_m:
            errors.append("index.html missing meta description")
        else:
            desc = desc_m.group(1).strip()
            if len(desc) < 50 or len(desc) > 165:
                errors.append(f"Meta description length {len(desc)} outside [50, 165]")

        # Canonical
        if '<link rel="canonical" href="https://howlcipher.github.io/redistricting-map/">' not in html:
            errors.append("index.html missing or incorrect canonical link")

        # OpenGraph
        if 'property="og:title"' not in html or 'property="og:description"' not in html or 'property="og:url"' not in html:
            errors.append("index.html missing required og metadata tags")

        # Twitter
        if 'name="twitter:card"' not in html:
            errors.append("index.html missing twitter:card metadata")

        # Schema.org JSON-LD
        jsonld_m = re.search(r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', html, re.DOTALL)
        if not jsonld_m:
            errors.append("index.html missing JSON-LD structured data")
        else:
            try:
                data = json.loads(jsonld_m.group(1))
                if data.get("@context") != "https://schema.org":
                    errors.append("JSON-LD missing @context https://schema.org")
                author = data.get("author", {})
                if author.get("name") != "William Elias":
                    errors.append("JSON-LD author name is not 'William Elias'")
                if "https://howlcipher.github.io/william_elias/" not in author.get("url", ""):
                    errors.append("JSON-LD author url does not point to William Elias portfolio")
            except Exception as e:
                errors.append(f"JSON-LD parsing error: {e}")

        # Single H1
        h1_matches = re.findall(r"<h1\b[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
        if len(h1_matches) != 1:
            errors.append(f"Expected exactly 1 <h1> tag, found {len(h1_matches)}")

        # William Elias Link
        if "https://howlcipher.github.io/william_elias/" not in html:
            errors.append("index.html missing portfolio link to William Elias")

    if errors:
        print("SEO verification FAILED with errors:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)

    print("SEO verification PASSED successfully.")

if __name__ == "__main__":
    main()
