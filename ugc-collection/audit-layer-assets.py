"""Read-only QA for prepared layer sheets; requires Pillow. Does not alter images."""
import io
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
registry = json.loads((root / 'layer-assets.json').read_text())
rows = []
for campaign in registry['campaigns']:
    with Image.open(root / campaign['kit']) as kit:
        assert kit.mode == 'RGBA', f"{campaign['id']}: missing alpha"
        with Image.open(root / campaign['background']) as background:
            assert min(background.size) >= 1000, f"{campaign['id']}: low-resolution background"
        regions = []
        for role, (x, y, width, height) in campaign['regions'].items():
            assert x >= 0 and y >= 0 and width > 0 and height > 0
            assert x + width <= kit.width and y + height <= kit.height, f"{campaign['id']} {role}: crop outside sheet"
            crop = kit.crop((x, y, x + width, y + height))
            alpha = crop.getchannel('A').histogram()
            clear = alpha[0] / sum(alpha)
            assert .01 < clear < .99, f"{campaign['id']} {role}: empty or opaque crop"
            encoded = io.BytesIO()
            crop.save(encoded, format='PNG')
            data_url_length = 22 + 4 * ((len(encoded.getvalue()) + 2) // 3)
            assert data_url_length <= 2_800_000, f"{campaign['id']} {role}: exceeds editor image limit"
            regions.append({'role': role, 'clearFraction': round(clear, 3), 'dataUrlLength': data_url_length})
        rows.append({'id': campaign['id'], 'size': list(kit.size), 'regions': regions})
print(json.dumps({'preparedCampaigns': len(rows), 'campaigns': rows}, indent=2))
