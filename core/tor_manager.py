import os
import asyncio
import subprocess
from curl_cffi import requests as crequests

class TorManager:
    def __init__(self):
        self.process = None
        self.socks_port = 9050
        self.ctrl_port = 9051
        self.current_ip = "Unknown"
        self.tor_exe = r"C:\Tor Browser\Browser\TorBrowser\Tor\tor.exe"
        self.tor_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tor_data")
        if not os.path.exists(self.tor_data_dir):
            os.makedirs(self.tor_data_dir, exist_ok=True)

    async def get_my_ip(self):
        try:
            p = f"socks5h://127.0.0.1:{self.socks_port}"
            r = await asyncio.to_thread(
                crequests.get,
                "https://api64.ipify.org?format=json",
                proxies={"http": p, "https": p},
                timeout=10,
            )
            self.current_ip = r.json().get("ip", "Unknown")
            return self.current_ip
        except Exception as e:
            self.current_ip = "Mirroring..."
            return self.current_ip

    async def start(self):
        try:
            subprocess.run(["taskkill", "/F", "/IM", "tor.exe"], capture_output=True)
            await asyncio.sleep(1)
            cmd = [
                self.tor_exe,
                "--SocksPort", str(self.socks_port),
                "--ControlPort", str(self.ctrl_port),
                "--DataDirectory", self.tor_data_dir,
                "--AvoidDiskWrites", "1",
            ]
            self.process = subprocess.Popen(
                cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            for _ in range(30):
                if await self.is_alive():
                    await self.get_my_ip()
                    return True
                await asyncio.sleep(1)
            return False
        except Exception as e:
            print(f"Tor start error: {e}")
            return False

    async def stop(self):
        try:
            if self.process:
                self.process.terminate()
                try:
                    self.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                self.process = None
            else:
                subprocess.run(
                    ["taskkill", "/F", "/IM", "tor.exe"], capture_output=True
                )
            self.current_ip = "Disconnected"
            return True
        except Exception as e:
            print(f"Tor stop error: {e}")
            return False

    async def renew_ip(self):
        import socket
        try:
            with socket.socket() as s:
                s.settimeout(3)
                s.connect(("127.0.0.1", self.ctrl_port))
                s.sendall(b'AUTHENTICATE ""\r\n')
                if b"250 OK" in s.recv(1024):
                    s.sendall(b'SIGNAL NEWNYM\r\n')
                    if b"250 OK" in s.recv(1024):
                        await asyncio.sleep(7)
                        await self.get_my_ip()
                        return True
        except Exception as e:
            print(f"Tor renew error: {e}")
        return False

    async def is_alive(self):
        import socket
        try:
            socket.create_connection(
                ("127.0.0.1", self.socks_port), timeout=1
            ).close()
            return True
        except OSError:
            return False

tor_m = TorManager()

async def get_active_proxy():
    if await tor_m.is_alive():
        return f"socks5h://127.0.0.1:{tor_m.socks_port}"
    return None
