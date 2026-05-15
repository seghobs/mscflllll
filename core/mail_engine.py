import httpx
import random
import string
import time
import re
import asyncio

class AsyncMailTM:
    def __init__(self):
        self.api = "https://api.mail.tm"
        self.client = httpx.AsyncClient(timeout=15)
        self.email = None
        self.password = None
        self.token = None

    async def create_account(self):
        try:
            d_res = (await self.client.get(f"{self.api}/domains")).json()
            if not d_res.get("hydra:member"):
                return False
            domain = d_res["hydra:member"][0]["domain"]
            username = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
            self.email = f"{username}@{domain}"
            self.password = "Pass123!@"
            r = await self.client.post(
                f"{self.api}/accounts",
                json={"address": self.email, "password": self.password},
            )
            if r.status_code != 201:
                return False
            t_res = (await self.client.post(
                f"{self.api}/token",
                json={"address": self.email, "password": self.password},
            )).json()
            self.token = t_res["token"]
            return True
        except Exception as e:
            print(f"Mail.tm create error: {e}")
            return False

    async def wait_for_code(self, timeout=70):
        start = time.time()
        while time.time() - start < timeout:
            try:
                h = {"Authorization": f"Bearer {self.token}"}
                r = (await self.client.get(f"{self.api}/messages", headers=h)).json()
                msgs = r.get("hydra:member", [])
                if msgs:
                    m_id = msgs[0]["id"]
                    msg_data = (await self.client.get(
                        f"{self.api}/messages/{m_id}", headers=h
                    )).json()
                    html_part = msg_data.get("html", "")
                    if isinstance(html_part, list):
                        html_part = html_part[0] if html_part else ""
                    content = (msg_data.get("text") or "") + (html_part or "")
                    digits = re.findall(r'\b\d{6}\b', content)
                    code = next((c for c in digits if c != "142133"), None)
                    if code:
                        return code
                await asyncio.sleep(5)
            except Exception as e:
                print(f"Mail.tm poll error: {e}")
                await asyncio.sleep(5)
        return None
