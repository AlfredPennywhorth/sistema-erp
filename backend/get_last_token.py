from sqlmodel import Session, select
from app.models.database import engine, Invite

def get_last_token():
    with Session(engine) as session:
        invite = session.exec(select(Invite).order_by(Invite.id.desc())).first()
        if invite:
            print(f"LAST_TOKEN={invite.token}")
        else:
            print("No invite found")

if __name__ == "__main__":
    get_last_token()
