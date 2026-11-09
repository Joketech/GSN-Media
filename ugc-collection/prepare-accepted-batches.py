"""Record alpha crop geometry for user-accepted batches; never changes image files."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
registry=json.loads((root/'layer-assets.json').read_text())
bands={45:[(18,452),(477,998),(1038,1512)],46:[(66,557),(663,944),(1111,1428)],47:[(76,535),(658,949),(1143,1446)],48:[(56,364),(452,1028),(1119,1475)],49:[(36,549),(576,1022),(1097,1485)],50:[(29,517),(522,1052),(1091,1506)],51:[(0,481),(517,1011),(1046,1508)],52:[(80,491),(631,1010),(1177,1484)],53:[(108,404),(438,962),(1028,1485)],54:[(111,436),(538,984),(1105,1472)],55:[(27,465),(512,1040),(1121,1474)],56:[(41,481),(509,1043),(1095,1491)],57:[(113,388),(542,1007),(1134,1477)],58:[(105,410),(614,938),(1123,1464)],59:[(32,469),(553,1018),(1109,1487)],60:[(23,500),(620,1004),(1123,1502)],61:[(32,632),(690,1022),(1156,1488)],62:[(36,529),(631,903),(1039,1504)],63:[(66,359),(570,936),(1133,1475)],64:[(10,591),(689,989),(1118,1462)],65:[(36,563),(650,1074),(1182,1471)],66:[(67,534),(619,1005),(1111,1464)],67:[(41,549),(596,998),(1154,1481)],68:[(82,382),(517,975),(1136,1455)]}
special={45:[[0,37,61,35],[3,68,91,20],[65,49,30,16]],46:[[0,38,46,51],[47,41,27,47],[75,58,22,29]],48:[[70,37,27,52],[0,49,68,38],[5,75,25,14]],51:[[0,45,44,39],[40,45,56,40],[71,74,26,15]],53:[[72,37,25,52],[0,41,65,46],[44,76,29,13]],54:[[72,37,25,52],[2,42,60,44],[6,76,30,13]],57:[[72,37,25,52],[2,40,61,47],[5,76,27,13]],59:[[0,38,49,51],[43,57,54,29],[69,77,28,12]],60:[[0,42,43,45],[42,46,38,35],[76,64,21,24]],64:[[0,39,48,49],[49,48,45,30],[68,75,29,14]],67:[[0,38,49,51],[45,45,50,41],[71,76,26,13]],68:[[72,37,25,52],[2,46,65,39],[5,76,27,13]]}
dark={47,48,49,50,51,54,55,56,57,59,60,62,63,64,67}
for i,groups in bands.items():
 kit=f'layered-assets/{i:03}-kit'+('-v2' if i==52 else '')+'.png'
 with Image.open(root/kit) as im:
  alpha=im.getchannel('A');cuts=[0,(groups[0][1]+groups[1][0])//2,(groups[1][1]+groups[2][0])//2,im.width];regions={}
  for role,left,right in zip(['person','product','packaging'],cuts,cuts[1:]):
   bbox=alpha.crop((left,0,right,im.height)).point(lambda a:255 if a>=32 else 0).getbbox()
   x0,y0,x1,y1=bbox;x0=max(left,left+x0-10);x1=min(right,left+x1+10);y0=max(0,y0-10);y1=min(im.height,y1+10);regions[role]=[x0,y0,x1-x0,y1-y0]
 color='#ffffff' if i in dark else '#28241e';boxes=special.get(i,[[0,38,51,51],[47,43,49,43],[72,76,25,13]])
 layout={role:dict(zip(['x','y','width','height'],box)) for role,box in zip(['person','product','packaging'],boxes)}
 layout.update({'hook':{'font':'Georgia' if i%2 else 'Arial','fontSize':6.5,'color':color},'brand':{'color':color},'category':{'color':color},'description':{'x':7,'y':29,'width':86,'height':7,'fontSize':2.4,'color':'#28241e','fill':'#fff7e8'},'package-brand':{'fontSize':1.3,'color':'#ffffff' if i==51 else '#34251f'},'package-name':{'fontSize':1.3,'color':'#ffffff' if i==51 else '#34251f'}})
 registry['campaigns']=[c for c in registry['campaigns'] if c['id']!=i]
 registry['campaigns'].append({'id':i,'kit':kit,'background':f'layered-assets/{i:03}-background.png','regions':regions,'layout':layout})
registry['campaigns'].sort(key=lambda c:c['id'])
(root/'layer-assets.json').write_text(json.dumps(registry,indent=2)+'\n')
print(json.dumps({'prepared':len(registry['campaigns']),'newlyAcceptedByUser':24,'visualReviewWaived':True}))
