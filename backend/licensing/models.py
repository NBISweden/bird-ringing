from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator


class ChangeTracking(models.Model):
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="+")
    updated_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="+")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


ActorTypeChoices = [
    (1, "person"),
    (2, "station")
]


SexChoices = [
    (1, "male"),
    (2, "female"),
    (3, "undisclosed"),
    (4, "n/a"),
]


LanguageChoices = [
    (1, "sv")
]


ReportStatusChoices = [
    (1, "yes"),
    (2, "no"),
    (3, "incomplete")
]


LicenseRoleChoices = [
    (1, "ringer"),
    (2, "helper"),
    (3, "associate")
]


RelationStatusChoices = [
    (1, "active"),
    (2, "inactive")
]


class Actor(ChangeTracking):
    mnr = models.CharField(max_length=4, validators=[MinLengthValidator(limit_value=4)])
    name = models.CharField(max_length=2048)
    email = models.EmailField(max_length=2048, blank=True, default='')
    type = models.PositiveIntegerField(choices=ActorTypeChoices)
    sex = models.PositiveIntegerField(choices=SexChoices)
    birth_date = models.DateField()
    phone_number1 = models.CharField(max_length=200, blank=True, default='')
    phone_number2 = models.CharField(max_length=200, blank=True, default='')
    language = models.PositiveIntegerField(choices=LanguageChoices)

    def __str__(self):
        return f"{self.name} ({self.mnr})"


class License(ChangeTracking):
    expires_at = models.DateTimeField()
    starts_at = models.DateTimeField()
    location = models.TextField()
    description = models.TextField()
    report = models.PositiveIntegerField(choices=ReportStatusChoices);


class LicenseRelation(models.Model):
    actor = models.ForeignKey(Actor, on_delete=models.PROTECT, related_name="licenses")
    license = models.ForeignKey(License, on_delete=models.PROTECT, related_name="actors")
    mednr = models.CharField(max_length=4, validators=[MinLengthValidator(limit_value=4)])
    role = models.PositiveIntegerField(choices=LicenseRoleChoices)
    status = models.PositiveIntegerField(choices=RelationStatusChoices)