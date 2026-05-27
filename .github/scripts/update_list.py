import json
import os
import re
from datetime import datetime

ISSUE_TITLE = os.environ.get("ISSUE_TITLE", "")
ISSUE_BODY = os.environ.get("ISSUE_BODY", "")
ISSUE_NUMBER = os.environ.get("ISSUE_NUMBER", "")

JSON_FILE = "blocklist.json"
TXT_FILE = "blocklist.txt"

def update_blocklist():
    title_match = re.search(r'【檢舉】@([a-zA-Z0-9_\.]+)', ISSUE_TITLE)
    if not title_match:
        print("Issue title format invalid. Expected '【檢舉】@username'")
        return
    
    username = title_match.group(1)
    
    reason = "未註明"
    reason_match = re.search(r'-\s*\*\*原因\*\*\s*:\s*(.+)', ISSUE_BODY)
    if reason_match:
        reason = reason_match.group(1).strip()
    
    url = f"https://www.threads.com/@{username}"
    added_at = datetime.utcnow().strftime('%Y-%m-%d')
    
    data = []
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
                
    for item in data:
        if item.get("username") == username:
            print(f"User {username} already in blocklist.")
            return

    new_entry = {
        "username": username,
        "url": url,
        "reason": reason,
        "added_at": added_at,
        "issue_id": int(ISSUE_NUMBER) if ISSUE_NUMBER and ISSUE_NUMBER.isdigit() else None
    }
    data.append(new_entry)
    
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    with open(TXT_FILE, "a", encoding="utf-8") as f:
        f.write(f"{url}\n")
        
    print(f"Successfully added {username} to blocklist.")

if __name__ == "__main__":
    update_blocklist()
