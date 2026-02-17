from django.contrib.auth.models import User
from typing import Tuple
from django.core.mail import EmailMessage
from licensing.models import (
    License,
    Actor,
    CommunicationTypeChoices,
    CommunicationStatusChoices,
    LicenseCommunication
)
import smtplib


class CommunicationService:
    """
    This service aims to standardize the way communication is tracked
    within the application by centralizing the function of sending
    messages.
    """
    def __init__(self, mail):
        self.mail = mail

    def send_email_messages(
        self,
        messages: list[Tuple[License, Actor, EmailMessage]],
        communication_type: CommunicationTypeChoices,
        user: User
    ):
        with self.mail.get_connection() as connection:
            failed_messages: list[dict[str, object]] = []
            for (lic, actor, message) in messages:
                communication = LicenseCommunication.objects.create(
                    actor=actor,
                    license=lic,
                    type=communication_type,
                    status=CommunicationStatusChoices.FAILED,
                    note="Tried to send email",
                    created_by=user,
                    updated_by=user,
                )
                try:
                    message.connection = connection
                    message.send()
                    communication.status = CommunicationStatusChoices.SENT
                    communication.save()
                    
                except smtplib.SMTPException as e:
                    failed_messages.append({
                        "to": message.to,
                        "details": str(e)
                    })
                    communication.note = str(e)
                    communication.save()

            return failed_messages