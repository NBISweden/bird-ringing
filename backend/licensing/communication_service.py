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
            failed_messages: list[str] = []
            for (lic, actor, message) in messages:
                try:
                    message.connection = connection
                    message.send()
                    LicenseCommunication.objects.create(
                        actor=actor,
                        license=lic,
                        type=communication_type,
                        status=CommunicationStatusChoices.SENT,
                        created_by=user,
                        updated_by=user,
                    )
                except smtplib.SMTPException as e:
                    failed_messages.append({
                        "to": message.to,
                        "details": str(e)
                    })
                    LicenseCommunication.objects.create(
                        actor=actor,
                        license=lic,
                        type=communication_type,
                        status=CommunicationStatusChoices.BOUNCED,
                        note=str(e),
                        created_by=user,
                        updated_by=user,
                    )

            return failed_messages