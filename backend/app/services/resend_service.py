import resend
import os
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

class ResendService:
    @staticmethod
    def send_invite_email(to_email: str, company_name: str, invite_link: str):
        """
        Envia um e-mail de convite para um novo membro da equipe.
        """
        api_key = os.getenv("RESEND_API_KEY")
        env = os.getenv("ENVIRONMENT", "production")

        if not api_key or env == "development":
            print(f"INFO: [E-MAIL SIMULADO] Destino: {to_email} | Link: {invite_link}")
            return {"status": "mocked", "message": "Development mode: E-mail logged to console."}

        resend.api_key = api_key

        params = {
            "from": "ERP Modular <onboarding@resend.dev>", # Em produção usar domínio verificado
            "to": [to_email],
            "subject": f"Convite para participar da equipe {company_name}",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #005681;">Você foi convidado!</h2>
                    <p>Olá,</p>
                    <p>Você foi convidado pela empresa <strong>{company_name}</strong> para fazer parte da equipe no nosso ERP Modular.</p>
                    <div style="margin: 30px 0;">
                        <a href="{invite_link}" style="background-color: #005681; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Aceitar Convite e Acessar
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">Ou copie e cole este link no seu navegador: <br> {invite_link}</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="font-size: 12px; color: #94a3b8;">Este link expira em 48 horas.</p>
                </div>
            """
        }

        try:
            r = resend.Emails.send(params)
            return r
        except Exception as e:
            print(f"Erro ao enviar e-mail via Resend: {str(e)}")
            return {"error": str(e)}
