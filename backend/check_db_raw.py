import sqlite3

def get_token():
    conn = sqlite3.connect('erp.db')
    cursor = conn.cursor()
    cursor.execute("SELECT token FROM convites ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    if row:
        t = row[0]
        print(f"NEW_TOKEN: {t}")
    else:
        print("No token found")
    conn.close()

if __name__ == "__main__":
    get_token()
