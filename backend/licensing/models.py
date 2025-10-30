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


class ActorTypeChoices(models.IntegerChoices):
    PERSON = (0, "person")
    STATION = (1, "station")


class SexChoices(models.IntegerChoices):
    MALE = (1, "male")
    FEMALE = (2, "female")
    UNDISCLOSED = (3, "undisclosed")
    NOT_APPLICABLE = (4, "n/a")

class LanguageChoices(models.IntegerChoices):
    SV = (1, "sv")


class ReportStatusChoices(models.IntegerChoices):
    YES = (1, "yes")
    NO = (2, "no")
    INCOMPLETE = (3, "incomplete")


class LicenseRoleChoices(models.IntegerChoices):
    RINGER = (1, "ringer")
    HELPER = (2, "helper")
    ASSOCIATE = (3, "associate")


class RelationStatusChoices(models.IntegerChoices):
    ACTIVE = (1, "active")
    INACTIVE = (2, "inactive")
    TERMINATED = (3, "terminated")


class DocumentTypeChoices(models.IntegerChoices):
    DOCUMENT = (1, "document")
    LICENSE = (2, "license")


class Actor(ChangeTracking):
    """
    An Actor contains information needed to identify and communicate with an 
    organization or individual related to any number of licenses.
    """

    full_name = models.CharField(max_length=2048)
    given_name = models.CharField(max_length=128, blank=True, default='')
    type = models.PositiveIntegerField(choices=ActorTypeChoices)
    sex = models.PositiveIntegerField(choices=SexChoices)
    birth_date = models.DateField()
    language = models.PositiveIntegerField(choices=LanguageChoices)

    phone_number1 = models.CharField(max_length=128, blank=True, default='')
    phone_number2 = models.CharField(max_length=128, blank=True, default='')

    email = models.EmailField(max_length=2048, blank=True, default='')
    alternative_email = models.EmailField(max_length=2048, blank=True, default='')

    address = models.CharField(max_length=512, blank=True, default='')
    co_address = models.CharField(max_length=512, blank=True, default='')
    postal_code = models.CharField(max_length=64, blank=True, default='')
    city = models.CharField(max_length=256, blank=True, default='')
    country = models.CharField(max_length=256, blank=True, default='')

    def __str__(self):
        return self.full_name


class License(ChangeTracking):
    """
    A License groups all the information related to activities performed by 
    any number of actors.

    Only the currently active license for a given `mnr` may be updated.

    The history of a license is importat to keep so that activity can be 
    tracked over time. Changes to a current license may overwrite the
    current state but when a new period begins a new license entry should
    be created in order to keep track of what happened during the last period.
    """

    mnr = models.CharField(max_length=4, validators=[MinLengthValidator(limit_value=4)])
    location = models.TextField()
    description = models.TextField()
    reportStatus = models.PositiveIntegerField(choices=ReportStatusChoices)

    starts_at = models.DateField()
    ends_at = models.DateField()

    def __str__(self):
        return self.mnr


class Species(ChangeTracking):
    """
    A Species describes a species that is available for licensed activities.
    """

    name = models.CharField(max_length=512)
    scientificName = models.CharField(max_length=512, blank=True, default='')
    scientificCode = models.CharField(max_length=128, blank=True, default='')

    def __str__(self):
        return self.name


class LicenseRelation(ChangeTracking):
    """
    A License Relation described the connection between an actor and a license.

    Only license relations related to a currently active license may be
    updated.

    When creating a new license for a new period the license relations should
    remain connected to the license of the previous period in order to keep
    a complete record of the actors' history. If the same relations are
    needed for the new period then new relation entries should be created.
    """

    actor = models.ForeignKey(Actor, on_delete=models.PROTECT, related_name="licenses")
    license = models.ForeignKey(License, on_delete=models.PROTECT, related_name="actors")
    mednr = models.CharField(max_length=4, validators=[MinLengthValidator(limit_value=4)], blank=True, default='')
    role = models.PositiveIntegerField(choices=LicenseRoleChoices)
    status = models.PositiveIntegerField(choices=RelationStatusChoices)


class LicenseDocument(ChangeTracking):
    """
    A License Document describes and references documents related to a
    license. This can be general documents or system generated license files.

    A license document should generally not be updated but references may be.
    """

    actor = models.ForeignKey(Actor, on_delete=models.PROTECT, related_name="documents", null=True)
    license = models.ForeignKey(License, on_delete=models.PROTECT, related_name="documents")
    type = models.PositiveIntegerField(choices=DocumentTypeChoices)
    data = models.BinaryField() # TODO: This might not be the best solution but let's try for now
    reference = models.CharField(max_length=2048, blank=True, default='')

    def __str__(self):
        type_str = DocumentTypeChoices(self.type).label
        return (
            f"{self.license.mnr} ({self.actor}) {type_str}"
            if self.actor
            else f"{self.license.mnr} {type_str}"
        )


class LicensePermissionType(ChangeTracking):
    """
    A License Permission Type describes a permission or activity that
    can be granted to a license.
    """

    name = models.CharField(max_length=512)
    description = models.TextField(blank=True, default='')

    def __str__(self):
        return self.name


class LicensePermissionProperty(ChangeTracking):
    """
    A license permission property is a property that can be assigned
    to a license permission in order to further specify the intent.

    The idea is to use this for properties that can be enumerated or
    be treated as boolean properties where and assigned property 
    means that the property applies to the current permission.
    """

    related_type = models.ForeignKey(LicensePermissionType, on_delete=models.PROTECT)
    name = models.CharField(max_length=512)
    description = models.TextField(blank=True, default='')

    def __str__(self):
        return self.name


class LicensePermission(ChangeTracking):
    """
    A License Permission is a permission or activity assigned to a specific
    license including additional details related to the activity and license.

    Only a license permission related to a currently active license may be 
    updated.

    When creating a new license for a new period the license permission should
    remain connected to the license of the previous period in order to keep
    a complete record of the activity history. If the same permission or
    activity is needed for the new period then new license permission should be
    created.
    """

    type = models.ForeignKey(LicensePermissionType, on_delete=models.PROTECT)
    license = models.ForeignKey(License, on_delete=models.PROTECT, related_name="permissions")
    location = models.TextField()
    description = models.TextField()
    species_list = models.ManyToManyField(Species)
    properties = models.ManyToManyField(LicensePermissionProperty)

    starts_at = models.DateField()
    ends_at = models.DateField()