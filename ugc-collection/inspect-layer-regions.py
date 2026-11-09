"""Propose non-overlapping crop regions from alpha gutters. Never changes images or registry."""
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
results = []
for campaign_id in map(int, sys.argv[1:]):
    path = root / f'layered-assets/{campaign_id:03}-kit.png'
    with Image.open(path) as im:
        assert im.mode == 'RGBA', f'{campaign_id}: missing alpha'
        alpha = im.getchannel('A')
        scale = im.width / 1536
        counts = [sum(v >= 128 for v in alpha.crop((x, 0, x + 1, im.height)).get_flattened_data()) for x in range(im.width)]
        boundaries = [0]
        gutters = []
        for lo, hi in [(500, 900), (1040, 1260)]:
            candidates = range(round(lo * scale), round(hi * scale))
            best = min(candidates, key=lambda x: (counts[x], abs(x - (lo + hi) * scale / 2)))
            boundaries.append(best)
            gutters.append(counts[best])
        boundaries.append(im.width)
        regions = {}
        for role, left, right in zip(['person', 'product', 'packaging'], boundaries, boundaries[1:]):
            tile = alpha.crop((left, 0, right, im.height))
            bbox = tile.point(lambda a: 255 if a >= 32 else 0).getbbox()
            assert bbox, f'{campaign_id} {role}: empty tile'
            x0, y0, x1, y1 = bbox
            x0, y0 = max(left, left + x0 - 12), max(0, y0 - 12)
            x1, y1 = min(right, left + x1 + 12), min(im.height, y1 + 12)
            regions[role] = [x0, y0, x1 - x0, y1 - y0]
        results.append({'id': campaign_id, 'regions': regions, 'opaqueGutterPixels': gutters, 'needsReview': any(gutters)})
print(json.dumps(results, indent=2))
