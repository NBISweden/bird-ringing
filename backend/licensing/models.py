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


class LicenseStatus(models.IntegerChoices):
    ACTIVE = (1, "active")
    INACTIVE = (2, "inactive")
    TERMINATED = (3, "terminated")


class DocumentTypeChoices(models.IntegerChoices):
    DOCUMENT = (1, "document")
    LICENSE = (2, "license")


class CommunicationType(models.IntegerChoices):
    LICENSE_DELIVERY = (1, "license-delivery")
    LICENSE_UPDATE = (2, "license-update")


class CommunicationStatus(models.IntegerChoices):
    SENT = (1, "sent")
    RECEIVED = (2, "received")
    BOUNCED = (3, "bounced")


class Actor(ChangeTracking):
    """
    An Actor contains information needed to identify and communicate with an 
    organization or individual related to any number of licenses.
    """

    full_name = models.CharField(max_length=2048)
    first_name = models.CharField(max_length=1024, blank=True, default='')
    last_name = models.CharField(max_length=1024, blank=True, default='')
    type = models.PositiveIntegerField(choices=ActorTypeChoices)
    sex = models.PositiveIntegerField(choices=SexChoices)
    birth_date = models.DateField(blank=True, null=True)
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


class LicenseSequence(ChangeTracking):
    """
    A LicenseSequence is the main element that groups a number of license
    instances together. It carries the the global license identifier MNR
    and the current status of the license sequence so that one can
    see which state it is currently in.
    """
    mnr = models.CharField(max_length=4, validators=[MinLengthValidator(limit_value=4)], unique=True)
    status = models.PositiveIntegerField(choices=LicenseStatus)

    @property
    def current(self):
        return License.objects.filter(sequence=self, version=0).first()

    def __str__(self):
        return self.mnr


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
    version = models.PositiveIntegerField() # Value zero is the current editable version
    sequence = models.ForeignKey(LicenseSequence, on_delete=models.PROTECT, related_name="instances")
    location = models.TextField()
    description = models.TextField()
    report_status = models.PositiveIntegerField(choices=ReportStatusChoices)

    starts_at = models.DateField()
    ends_at = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["version", "sequence"], name="version-sequence-unique")
        ]

    def __str__(self):
        return f"{self.sequence.mnr}:{self.version}"


class Species(ChangeTracking):
    """
    A Species describes a species that is available for licensed activities.
    """

    name = models.CharField(max_length=512)
    scientific_name = models.CharField(max_length=512, blank=True, default='')
    scientific_code = models.CharField(max_length=128, blank=True, default='')

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
    license = models.ForeignKey(License, on_delete=models.CASCADE, related_name="actors")
    mednr = models.CharField(max_length=4, validators=[MinLengthValidator(limit_value=4)], blank=True, default='')
    role = models.PositiveIntegerField(choices=LicenseRoleChoices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["actor", "license"], name="unique-actors-for-license"),
            models.UniqueConstraint(fields=["mednr", "license"], name="unique-mednr-for-license"),
        ]


class LicenseCommunication(ChangeTracking):
    """
    A License Communication keeps track of communication related to licenses
    made by the system or triggered by users of the system.
    """

    actor = models.ForeignKey(Actor, on_delete=models.PROTECT, related_name="communication")
    license = models.ForeignKey(License, on_delete=models.CASCADE, related_name="communication")
    type = models.PositiveIntegerField(choices=CommunicationType)
    status = models.PositiveIntegerField(choices=CommunicationStatus)
    note = models.CharField(max_length=512, blank=True, default='')


class LicenseDocument(ChangeTracking):
    """
    A License Document describes and references documents related to a
    license. This can be general documents or system generated license files.

    A license document should generally not be updated but references may be
    as long as they belong to the active license instance.
    """

    actor = models.ForeignKey(Actor, on_delete=models.PROTECT, related_name="documents", null=True)
    license = models.ForeignKey(License, on_delete=models.CASCADE, related_name="documents")
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

    A LicensePermissionProperty without a related_type is considered
    a general property and may be assigned to any permission.
    """

    related_type = models.ForeignKey(LicensePermissionType, on_delete=models.CASCADE, blank=True, null=True)
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
    license = models.ForeignKey(License, on_delete=models.CASCADE, related_name="permissions")
    location = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    species_list = models.ManyToManyField(Species, blank=True)
    properties = models.ManyToManyField(LicensePermissionProperty, blank=True)

    starts_at = models.DateField(blank=True, null=True)
    ends_at = models.DateField(blank=True, null=True)