import os
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv("DATABASE_URL", "")
db_host = db_url.split("@")[-1].split(":")[0] if "@" in db_url else "N/A"
print(f"[CONFIRMAÇÃO] DB HOST: {db_host}")
