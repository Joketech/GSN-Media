#!/usr/bin/env python3
"""GSN v1 client for Hermes. Standard library only; never prints credentials."""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file',default='/opt/gsn-media/.env')
    parser.add_argument('--base',default=os.environ.get('GSN_BASE_URL','http://127.0.0.1:4188'))
    sub=parser.add_subparsers(dest='command',required=True)
    sub.add_parser('health');sub.add_parser('voices');sub.add_parser('templates');sub.add_parser('jobs')
    voice=sub.add_parser('save-voice');voice.add_argument('--name',required=True);voice.add_argument('--audio',required=True);voice.add_argument('--transcript-file',required=True)
    create=sub.add_parser('create');create.add_argument('--json',required=True);create.add_argument('--key',required=True);create.add_argument('--image');
    job=sub.add_parser('status');job.add_argument('id')
    wait=sub.add_parser('wait');wait.add_argument('id');wait.add_argument('--timeout',type=int,default=1800)
    download=sub.add_parser('download');download.add_argument('id');download.add_argument('--out',required=True)
    review=sub.add_parser('review');review.add_argument('id');review.add_argument('decision',choices=['approved','rejected'])
    args=parser.parse_args()
    base=args.base.rstrip('/');target=urlparse(base)
    if target.scheme not in ('http','https') or not target.hostname or target.username or target.password:
        raise ValueError('Use an HTTP(S) studio URL without credentials.')
    if target.scheme=='http' and target.hostname not in ('127.0.0.1','localhost','::1'):
        raise ValueError('Use HTTPS for a non-loopback studio URL or an SSH tunnel.')
    token=os.environ.get('GSN_AGENT_TOKEN','')
    if not token:
        env=Path(args.env_file).read_text()
        match=re.search(r'^GSN_AGENT_TOKEN=(.+)$',env,re.M)
        token=match.group(1).strip().strip("'\"") if match else ''
    if not token: raise ValueError('GSN_AGENT_TOKEN is missing. Run deploy/setup-v1.sh.')
    def request(route,payload=None,key=None,binary=False):
        headers={'Authorization':'Bearer '+token}
        if payload is not None: headers['Content-Type']='application/json'
        if key: headers['Idempotency-Key']=key
        req=urllib.request.Request(base+'/api/v1'+route,data=json.dumps(payload).encode() if payload is not None else None,headers=headers)
        try:
            with urllib.request.urlopen(req,timeout=60) as response:
                return response.read() if binary else json.load(response)
        except urllib.error.HTTPError as exc:
            try: message=json.loads(exc.read()).get('error',str(exc.code))
            except Exception: message=str(exc.code)
            raise ValueError('Studio HTTP '+str(exc.code)+': '+message) from None
    if hasattr(args,'id') and not re.fullmatch(r'[a-f0-9-]{36}',args.id): raise ValueError('Invalid job ID.')
    if args.command in ('health','voices','templates','jobs'): result=request('/'+args.command)
    elif args.command=='save-voice':
        audio=Path(args.audio).read_bytes()
        if len(audio)>20*1024*1024: raise ValueError('Voice sample exceeds 20 MB.')
        result=request('/voices',{'name':args.name,'reference_text':Path(args.transcript_file).read_text(),'audio_base64':base64.b64encode(audio).decode()})
    elif args.command=='create':
        payload=json.loads(Path(args.json).read_text())
        if args.image:
            data=Path(args.image).read_bytes()
            if len(data)>10*1024*1024: raise ValueError('Starting image exceeds 10 MB.')
            payload['image_base64']=base64.b64encode(data).decode()
        result=request('/jobs',payload,args.key)
    elif args.command=='status': result=request('/jobs/'+args.id)
    elif args.command=='wait':
        deadline=time.monotonic()+max(1,args.timeout)
        while True:
            result=request('/jobs/'+args.id)
            if result['state'] in ('complete','failed','interrupted'): break
            if time.monotonic()>deadline: raise ValueError('Wait timed out; the job is still recorded. Check status later.')
            time.sleep(10)
    elif args.command=='review': result=request('/jobs/'+args.id+'/review',{'review':args.decision})
    elif args.command=='download':
        result=request('/jobs/'+args.id)
        if result['state']!='complete': raise ValueError('The job is not complete.')
        output=Path(args.out)
        # Never overwrite an existing collected asset by accident.
        with output.open('xb') as stream: stream.write(request('/jobs/'+args.id+'/asset',binary=True))
        result={'id':args.id,'saved_to':str(output.resolve()),'review':result.get('review')}
    print(json.dumps(result,indent=2))
    if isinstance(result,dict) and result.get('state') in ('failed','interrupted'): return 2
    return 0

if __name__=='__main__':
    try: sys.exit(main())
    except (ValueError,OSError,urllib.error.URLError) as exc:
        print('GSN: '+str(exc),file=sys.stderr);sys.exit(1)
