from sqlmodel import Session, select
from app.models.database import engine, Invite

def get_last_token():
    with Session(engine) as session:
        invite = session.exec(select(Invite).order_by(Invite.id.desc())).first()
        if invite:
            t = str(invite.token)
            print(f"TOKEN_PART1: {t[:18]}")
            print(f"TOKEN_PART2: {t[18:]}")
        else:
            print("No invite found")

if __name__ == "__main__":
    get_last_token()
