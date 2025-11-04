#!/usr/bin/env bash
set -euo pipefail

SIZES=(480 768 1024 1600)
DEFAULT_HTML=("public/index.html" "public/social.html")

if [ $# -gt 0 ]; then
  HTML_FILES=("$@")
else
  HTML_FILES=("${DEFAULT_HTML[@]}")
fi

SKIP_CONVERT=${SKIP_CONVERT:-0}

if [ "$SKIP_CONVERT" -ne 1 ]; then
  if ! command -v cwebp >/dev/null 2>&1; then
    echo "Error: cwebp is not installed. Please install the WebP utilities." >&2
    exit 1
  fi
else
  echo "Warning: SKIP_CONVERT=1, skipping WebP generation" >&2
fi

if ! python - <<'PY' >/dev/null 2>&1
from PIL import Image
PY
then
  echo "Error: Pillow is required (pip install Pillow)." >&2
  exit 1
fi

mapfile -t metadata < <(python - "${HTML_FILES[@]}" <<'PY'
import re
import sys
from pathlib import Path
from PIL import Image

html_files = sys.argv[1:]
pattern = re.compile(r'<img[^>]*src="([^"]+)"', re.IGNORECASE)
seen = {}
for html in html_files:
    text = Path(html).read_text()
    for match in pattern.finditer(text):
        src = match.group(1)
        if not src.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        seen.setdefault(src, set()).add(html)

for src in sorted(seen):
    path = Path('public') / src
    if not path.exists():
        print(f"MISSING,{src}", file=sys.stderr)
        continue
    with Image.open(path) as img:
        width, height = img.size
    print(f"{src},{width},{height}")
PY
)

for entry in "${metadata[@]}"; do
  IFS=',' read -r rel_path width height <<<"$entry"
  input="public/$rel_path"
  base="${input%.*}"
  base_webp="${base}.webp"
  mkdir -p "$(dirname "$base_webp")"
  if [ "$SKIP_CONVERT" -ne 1 ]; then
    if [ ! -f "$base_webp" ] || [ "$input" -nt "$base_webp" ]; then
      cwebp -q 80 "$input" -o "$base_webp" >/dev/null
    fi
    for size in "${SIZES[@]}"; do
      output="${base}-${size}.webp"
      if [ -f "$output" ] && [ "$output" -nt "$input" ]; then
        continue
      fi
      if [ "$width" -lt "$size" ]; then
        cp "$base_webp" "$output"
      else
        cwebp -q 80 -resize "$size" 0 "$input" -o "$output" >/dev/null
      fi
    done
  fi
done

python - "${HTML_FILES[@]}" <<'PY'
import os
import re
import sys
from pathlib import Path
from PIL import Image
from html.parser import HTMLParser

sizes = [480, 768, 1024, 1600]
html_files = sys.argv[1:]
root = Path('public')
img_pattern = re.compile(r'<img[^>]*?>', re.IGNORECASE)

class ImgParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.attrs = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'img':
            self.attrs = attrs

def build_attr_string(order, attrs):
    return ' '.join(f"{name}=\"{attrs[name]}\"" for name in order if name in attrs)

for html_path in html_files:
    path = Path(html_path)
    original = path.read_text()

    def replace_img(match):
        tag = match.group(0)
        parser = ImgParser()
        parser.feed(tag)
        attrs = parser.attrs
        attr_dict = {name: value for name, value in attrs if value is not None}
        src = attr_dict.get('src')
        if not src or not src.lower().endswith(('.png', '.jpg', '.jpeg')):
            return tag
        if attr_dict.get('data-responsive') == 'webp':
            return tag
        image_path = root / src
        if not image_path.exists():
            print(f"Warning: {src} missing for {html_path}", file=sys.stderr)
            return tag
        with Image.open(image_path) as img:
            width, height = img.size
        base_rel = os.path.splitext(src)[0]
        webp_srcset = []
        for size in sizes:
            if width >= size:
                webp_srcset.append(f"{base_rel}-{size}.webp {size}w")
        webp_srcset.append(f"{base_rel}.webp {width}w")
        webp_srcset_str = ', '.join(webp_srcset)
        size_limit = min(width, max(sizes))
        sizes_value = f"(max-width: 768px) 100vw, {size_limit}px"
        attr_dict['width'] = str(width)
        attr_dict['height'] = str(height)
        attr_dict['loading'] = 'lazy'
        attr_dict['data-responsive'] = 'webp'
        attr_dict.pop('srcset', None)
        attr_dict.pop('sizes', None)
        order = [name for name, _ in attrs if name]
        for key in ['width', 'height', 'loading', 'data-responsive']:
            if key not in order:
                order.append(key)
        img_attr_string = build_attr_string(order, attr_dict)
        leading_ws_match = re.match(r'\s*', tag)
        leading_ws = leading_ws_match.group(0) if leading_ws_match else ''
        picture_indent = leading_ws
        inner_indent = picture_indent + '  '
        source_line = f"{inner_indent}<source type=\"image/webp\" srcset=\"{webp_srcset_str}\" sizes=\"{sizes_value}\">"
        img_line = f"{inner_indent}<img {img_attr_string} sizes=\"{sizes_value}\">"
        picture = (
            f"{picture_indent}<picture>\n"
            f"{source_line}\n"
            f"{img_line}\n"
            f"{picture_indent}</picture>"
        )
        return picture

    updated = img_pattern.sub(replace_img, original)
    path.write_text(updated)
PY
