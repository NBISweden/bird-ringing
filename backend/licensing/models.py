from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator
from django.template.defaultfilters import slugify
import hashlib
import json
import datetime
import decimal


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
    UNKNOWN = (0, "unknown")
    SV = (1, "sv")
    EN = (2, "en")


class ReportStatusChoices(models.IntegerChoices):
    YES = (1, "yes")
    NO = (2, "no")
    INCOMPLETE = (3, "incomplete")


class ReportTypeChoices(models.IntegerChoices):
    FINAL = (1, "final")
    PARTIAL = (2, "partial")


class LicenseRoleChoices(models.IntegerChoices):
    RINGER = (1, "ringer")
    HELPER = (2, "helper")
    ASSOCIATE = (3, "associate")
    COMMUNICATION = (4, "communication")


class LicenseStatusChoices(models.IntegerChoices):
    ACTIVE = (1, "active")
    INACTIVE = (2, "inactive")
    TERMINATED = (3, "terminated")


class DocumentTypeChoices(models.IntegerChoices):
    DOCUMENT = (1, "document")
    LICENSE = (2, "license")


class CommunicationTypeChoices(models.IntegerChoices):
    LICENSE_DELIVERY = (1, "license-delivery")
    LICENSE_UPDATE = (2, "license-update")


class CommunicationStatusChoices(models.IntegerChoices):
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
    language = models.PositiveIntegerField(choices=LanguageChoices, default=LanguageChoices.UNKNOWN)

    phone_number1 = models.CharField(max_length=128, blank=True, default='')
    phone_number2 = models.CharField(max_length=128, blank=True, default='')

    email = models.EmailField(max_length=2048, blank=True, default='')
    alternative_email = models.EmailField(max_length=2048, blank=True, default='')

    address = models.CharField(max_length=512, blank=True, default='')
    co_address = models.CharField(max_length=512, blank=True, default='')
    postal_code = models.CharField(max_length=64, blank=True, default='')
    city = models.CharField(max_length=256, blank=True, default='')
    country = models.CharField(max_length=256, blank=True, default='')

    description = models.TextField(blank=True, default='')

    @property
    def current_license_relations(self):
        return LicenseRelation.objects.filter(actor=self, license__version=0)

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
    status = models.PositiveIntegerField(choices=LicenseStatusChoices)

    @property
    def current(self):
        return License.objects.filter(sequence=self, version=0).first()

    @property
    def current(self):
        return License.objects.filter(sequence=self, version=0).first()

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
    
    @property
    def editable(self):
        return self.version == 0
    
    def copy_to_new_version(
        self,
        version: int,
        include_actors: bool = True,
        include_documents: bool = True,
        include_permissions: bool = True,
    ):
        actor_relations = [
            actor_relation
            for actor_relation in self.actors.all()
        ] if include_actors else []

        documents = [
            document
            for document in self.documents.all()
        ] if include_documents else []

        permissions = [
            permission
            for permission in self.permissions.all()
        ]

        self.pk = None
        self.version = version
        self.save()

        for item in [*actor_relations, *documents, *permissions]:
            item.copy_to(license=self)
        
        return self

    def __str__(self):
        return f"{self.sequence.mnr}:{self.version}"


class Species(ChangeTracking):
    """
    A Species describes a species that is available for licensed activities.
    """

    class Meta:
        verbose_name_plural = "Species"

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

    @property
    def mnr(self):
        return self.license.sequence.mnr

    def copy_to(self, license: License):
        self.pk = None
        self.license = license
        self.save()
        return self

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["actor", "role", "license"], name="unique-actors-for-role-and-license"),
            models.UniqueConstraint(fields=["mednr", "license"], name="unique-mednr-for-license"),
        ]


class LicenseCommunication(ChangeTracking):
    """
    A License Communication keeps track of communication related to licenses
    made by the system or triggered by users of the system.
    """

    actor = models.ForeignKey(Actor, on_delete=models.PROTECT, related_name="communication")
    license = models.ForeignKey(License, on_delete=models.CASCADE, related_name="communication")
    type = models.PositiveIntegerField(choices=CommunicationTypeChoices)
    status = models.PositiveIntegerField(choices=CommunicationStatusChoices)
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
    data = models.BinaryField(null=True) # TODO: This might not be the best solution but let's try for now
    reference = models.CharField(max_length=2048, blank=True, default='')

    def copy_to(self, license: License):
        self.pk = None
        self.license = license
        self.save()
        return self

    def __str__(self):
        type_str = DocumentTypeChoices(self.type).label
        return (
            f"{self.license} ({self.actor}) {type_str}"
            if self.actor
            else f"{self.license} {type_str}"
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

    def copy_to(self, license: License):
        properties = list(self.properties.all())
        species_list = list(self.species_list.all())
        self.pk = None
        self.license = license
        self.save()
        self.properties.set(properties)
        self.species_list.set(species_list)
        return self


def json_serialize_defaults(value):
    value_type = type(value)
    if value_type == datetime.date:
        return value.isoformat()
    elif value_type == datetime.datetime:
        return value.isoformat()
    elif value_type == decimal.Decimal:
        return float(value)
    elif value_type == set:
        return list(value)
    elif isinstance(value, models.Model):
        return str(value)
    else:
        raise TypeError(f"No default serializer for {value_type.__name__}")


def json_serialize(data):
    return json.dumps(data, indent=4, default=json_serialize_defaults)


class ImportModelManager(models.Manager):
    def get_updated_or_create_item(self, **kwargs):
        key = self.model.get_key(**kwargs)
        fingerprint = self.get_fingerprint(kwargs)
        item_model = self.get_item_model()
        try:
            item_import = self.get(key=key)
            item = item_import.item
            if item_import.fingerprint != fingerprint:
                for field, value in kwargs.items():
                    setattr(item, field, value)
                item.save()
            return (item_import, False)

        except self.model.DoesNotExist:
            item = item_model.objects.create(**kwargs)
            item_import = self.create(
                key=key,
                item=item,
                fingerprint=fingerprint
            )
            return (item_import, True)
    

    def get_or_create_item(self, **kwargs):
        key = self.model.get_key(**kwargs)
        item_model = self.get_item_model()
        try:
            item_import = self.get(key=key)
            return (item_import, False)

        except self.model.DoesNotExist:
            item = item_model.objects.create(**kwargs)
            item_import = self.create(
                key=key,
                item=item,
                fingerprint=self.get_fingerprint(kwargs)
            )
            return (item_import, True)
    
    def get_fingerprint(self, data):
        fingerprint = hashlib.sha1()
        fingerprint.update(json_serialize(data).encode(encoding="utf8"))
        return fingerprint.hexdigest()
    
    def get_item_model(self):
        item_field = self.model._meta.get_field("item")
        return item_field.remote_field.model


class ImportTracking(models.Model):
    key = models.CharField(max_length=1024, unique=True, blank=False, null=False)
    fingerprint = models.CharField(max_length=40, null=True)
    objects = ImportModelManager()

    class Meta:
        abstract = True
    
    def __str__(self):
        return self.key


class ActorImport(ImportTracking):
    item = models.ForeignKey(Actor, on_delete=models.CASCADE)

    @staticmethod
    def get_key(**actor):
        birth_date = actor.get("birth_date")
        type = actor["type"]
        full_name = actor["full_name"]
        year = birth_date.year if birth_date else None
        return slugify(f"{type} {full_name} {year}")


class SpeciesImport(ImportTracking):
    item = models.ForeignKey(Species, on_delete=models.CASCADE)

    @staticmethod
    def get_key(**species):
        scientific_code = species["scientific_code"]
        scientific_name = species["scientific_name"]
        return slugify(f"{scientific_code} {scientific_name}")


class LicenseSequenceImport(ImportTracking):
    item = models.ForeignKey(LicenseSequence, on_delete=models.CASCADE)

    @staticmethod
    def get_key(**license):
        mnr = license["mnr"]
        return slugify(mnr)


class LicenseImport(ImportTracking):
    item = models.ForeignKey(License, on_delete=models.CASCADE)

    @staticmethod
    def get_key(**license):
        sequence = license["sequence"]
        return slugify(sequence.mnr)