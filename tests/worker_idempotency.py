"""Submission deduplication without loading PyTorch or any model weights."""
import base64
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import types
import uuid

with tempfile.TemporaryDirectory(prefix='.gsn-worker-test-',dir=Path.cwd()) as directory:
    os.environ['WORKER_KIND']='voice'
    os.environ['DATA_DIR']=directory
    spec=importlib.util.spec_from_file_location('gsn_idempotent_worker',Path(__file__).resolve().parents[1]/'services/inference_worker.py')
    worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
    actual_executor=worker.EXECUTOR
    submissions=[]
    worker.EXECUTOR=types.SimpleNamespace(submit=lambda *args:submissions.append(args))
    worker.capability=lambda:{'ready':True}
    responses=[]
    def post(payload):
        data=json.dumps(payload).encode()
        request=types.SimpleNamespace(path='/jobs',headers={'Content-Length':str(len(data))},rfile=io.BytesIO(data),json_response=lambda status,value:responses.append((status,value)))
        worker.Handler.do_POST(request)
        return responses[-1]
    payload={'kind':'voice','text':'New narration.','reference_text':'My sample.','audio_base64':base64.b64encode(b'sample').decode(),'request_id':str(uuid.uuid4())}
    first=post(payload)
    worker.capability=lambda:{'ready':False,'message':'Deliberate offline state'}
    second=post(payload)
    assert first[0]==second[0]==202 and first[1]['id']==second[1]['id']
    assert len(submissions)==1
    record=worker.read_job(first[1]['id'])
    assert record['request_id']==payload['request_id'] and 'audio_base64' not in record
    actual_executor.shutdown(wait=False)
print('PASS: worker request ID survives in job records and prevents duplicate model submissions, even after availability changes.')
