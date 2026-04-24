import json
import uuid
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=5)
task_queue = {}
sse_clients = []

def sse_notify(event, data):
    msg = f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    dead = []
    for q in sse_clients:
        try:
            q.append(msg)
        except:
            dead.append(q)
    for d in dead:
        sse_clients.remove(d)

def submit_task(task_type, func, *args, **kwargs):
    task_id = str(uuid.uuid4())[:8]
    task_queue[task_id] = {"type": task_type, "status": "pending", "result": None, "error": None}
    def run():
        task_queue[task_id]["status"] = "running"
        sse_notify("task_update", {"id": task_id, "type": task_type, "status": "running"})
        try:
            print(f"[QUEUE] {task_type} {task_id} başladı")
            result = func(*args, **kwargs)
            task_queue[task_id]["result"] = result
            task_queue[task_id]["status"] = "done"
            sse_notify("task_update", {"id": task_id, "type": task_type, "status": "done", "result": result})
            print(f"[QUEUE] {task_type} {task_id} tamamlandı")
        except Exception as e:
            task_queue[task_id]["error"] = str(e)
            task_queue[task_id]["status"] = "error"
            sse_notify("task_update", {"id": task_id, "type": task_type, "status": "error", "error": str(e)})
            print(f"[QUEUE] {task_type} {task_id} hata: {e}")
    executor.submit(run)
    return task_id
