import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
import json
from typing import Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def send_email_notification(
    to_email: str,
    subject: str,
    body: str,
    config: Dict[str, str]
):
    """Send an email notification using SMTP."""
    try:
        message = MIMEMultipart()
        message["From"] = config["smtp_username"]
        message["To"] = to_email
        message["Subject"] = subject
        
        message.attach(MIMEText(body, "plain"))
        
        await aiosmtplib.send(
            message,
            hostname=config["smtp_host"],
            port=int(config["smtp_port"]),
            username=config["smtp_username"],
            password=config["smtp_password"],
            use_tls=True
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

async def send_webhook_notification(
    webhook_url: str,
    payload: Dict[str, Any],
    config: Dict[str, Any]
):
    """Send a webhook notification."""
    try:
        headers = {
            "Content-Type": "application/json",
            **config.get("headers", {})
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=5.0
            )
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send webhook: {e}")
        return False

async def process_alert_notification(
    rule: Any,
    detection: Dict[str, Any]
):
    """Process an alert based on its notification type."""
    try:
        if rule.notification_type == "email":
            config = rule.notification_config
            subject = f"Alert: {detection['name']} detected on camera {detection['camera_id']}"
            body = f"""
Face Detection Alert

Person: {detection['name']}
Camera: {detection['camera_id']}
Time: {detection['timestamp']}
Image: {detection['filename']}
            """
            await send_email_notification(
                config["to_email"],
                subject,
                body,
                config
            )
            
        elif rule.notification_type == "webhook":
            config = rule.notification_config
            payload = {
                "alert_rule": rule.name,
                "detection": detection,
                "timestamp": datetime.utcnow().isoformat()
            }
            await send_webhook_notification(
                config["webhook_url"],
                payload,
                config
            )
            
        # Browser notifications are handled by WebSocket
        # in the main server code
            
    except Exception as e:
        logger.error(f"Failed to process notification: {e}")