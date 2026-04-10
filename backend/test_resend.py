import os
from dotenv import load_dotenv
import resend

load_dotenv()

api_key = os.getenv("RESEND_API_KEY")
print(f"API Key: {api_key[:10]}...")

if not api_key:
    print("ERRO: RESEND_API_KEY não encontrada no .env")
    exit(1)

resend.api_key = api_key

try:
    print("Tentando enviar e-mail de teste...")
    r = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": "delivered@resend.dev", # Endereço de teste do Resend
        "subject": "Teste de Integração ERP",
        "html": "<strong>Funcionando!</strong>"
    })
    print("Resposta do Resend:", r)
except Exception as e:
    print("ERRO no envio:", str(e))
