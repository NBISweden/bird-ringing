from django.db import models
from django.db import transaction
from django.db.models import Max, F
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator
from django.template.defaultfilters import slugify
import hashlib
from .serializers import json_serialize


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
    ASSOCIATE_RINGER = (2, "associate ringer")
    AFFILIATE = (3, "affiliate")
    COMMUNICATION = (4, "communication")


class LicenseStatusChoices(models.IntegerChoices):
    ACTIVE = (1, "active")
    INACTIVE = (2, "inactive")
    TERMINATED = (3, "terminated")


class DocumentTypeChoices(models.IntegerChoices):
    DOCUMENT = (1, "document")
    LICENSE = (2, "license")
    PERMIT = (3, "permit")


class CommunicationTypeChoices(models.IntegerChoices):
    LICENSE_DELIVERY = (1, "license-delivery")
    LICENSE_UPDATE = (2, "license-update")


class CommunicationStatusChoices(models.IntegerChoices):
    SENT = (1, "sent")
    RECEIVED = (2, "received")
    BOUNCED = (3, "bounced")
    FAILED = (4, "failed")


class Actor(ChangeTracking):
    """
    An Actor contains information needed to identify and communicate with an
    organization or individual related to any number of licenses.
    """

    full_name = models.CharField(max_length=2048)
    first_name = models.CharField(max_length=1024, blank=True, default="")
    last_name = models.CharField(max_length=1024, blank=True, default="")
    type = models.PositiveIntegerField(choices=ActorTypeChoices)
    sex = models.PositiveIntegerField(choices=SexChoices)
    birth_date = models.DateField(blank=True, null=True)
    birth_year = models.PositiveIntegerField(blank=True, null=True)
    language = models.PositiveIntegerField(
        choices=LanguageChoices, default=LanguageChoices.UNKNOWN
    )

    phone_number1 = models.CharField(max_length=128, blank=True, default="")
    phone_number2 = models.CharField(max_length=128, blank=True, default="")

    email = models.EmailField(max_length=2048, blank=True, default="")
    alternative_email = models.EmailField(max_length=2048, blank=True, default="")

    address = models.CharField(max_length=512, blank=True, default="")
    co_address = models.CharField(max_length=512, blank=True, default="")
    postal_code = models.CharField(max_length=64, blank=True, default="")
    city = models.CharField(max_length=256, blank=True, default="")
    country = models.CharField(max_length=256, blank=True, default="")

    description = models.TextField(blank=True, default="")

    @property
    def license_relations(self):
        return LicenseRelation.objects.filter(actor=self, license__sequence__latest=F("license"))

    def __str__(self):
        return self.full_name


class LicenseSequence(ChangeTracking):
    """
    A LicenseSequence is the main element that groups a number of license
    instances together. It carries the global license identifier MNR
    and the current status of the license sequence so that one can
    see which state it is currently in.
    """

    mnr = models.CharField(
        max_length=4, validators=[MinLengthValidator(limit_value=4)], unique=True
    )
    status = models.PositiveIntegerField(choices=LicenseStatusChoices)
    latest = models.ForeignKey("License", null=True, on_delete=models.SET_NULL, related_name='+')

    def commit(self, current, post_commit=None):
        with transaction.atomic():
            if current is None:
                raise ValueError("No current license")

            current = License.objects.get(pk=current.pk)
            previous = self.latest
            if previous is None or not previous.is_equal(current):
                last_version = License.objects.filter(sequence__mnr=self.mnr).aggregate(
                    last_version=Max("version", default=0)
                )["last_version"]
                self.latest = current.copy_to_new_version(last_version + 1)
                self.save()
            
                if callable(post_commit):
                    post_commit(self.latest, previous)
                
            return self.latest

    @property
    def current(self):
        return License.objects.filter(sequence=self, version=0).first()

    def __str__(self):
        return self.mnr


class LicenseDocument(ChangeTracking):
    """
    A License Document describes and references documents related to a
    license. This can be general documents or system generated license files.

    A license document should generally not be updated but references may be
    as long as they belong to the active license instance.
    """

    is_permanent = models.BooleanField()
    actor = models.ForeignKey(
        Actor, on_delete=models.PROTECT, related_name="documents", null=True
    )
    type = models.PositiveIntegerField(choices=DocumentTypeChoices)
    data = models.BinaryField(
        null=True
    )  # TODO: This might not be the best solution but let's try for now
    reference = models.CharField(max_length=2048, blank=True, default="")

    fingerprint = models.CharField(max_length=64, blank=True, default="", db_index=True)

    def copy(self):
        self.pk = None
        self.save()
        return self

    def __str__(self):
        type_str = DocumentTypeChoices(self.type).label
        return (
            f"doc: ({self.actor}): {self.reference}: {type_str}"
            if self.actor
            else f"doc: {self.reference}: {type_str}"
        )


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

    version = (
        models.PositiveIntegerField()
    )
    sequence = models.ForeignKey(
        LicenseSequence, on_delete=models.PROTECT, related_name="instances"
    )
    location = models.TextField()
    description = models.TextField()
    report_status = models.PositiveIntegerField(choices=ReportStatusChoices)
    documents = models.ManyToManyField(LicenseDocument, blank=True)

    starts_at = models.DateField()
    ends_at = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["version", "sequence"], name="version-sequence-unique"
            )
        ]

    @property
    def editable(self):
        return self.version == 0
    
    def save(self, *args, **kwargs):
        if self.pk and not self.editable:
            raise ValueError(f"Only current license is editable {self.id} {self.version}")
        super().save(*args, **kwargs)

    def copy_to_new_version(
        self,
        version: int,
    ):
        base = License.objects.get(pk=self.pk)
        actor_relations = [actor_relation for actor_relation in base.actors.all()]
        documents = [document for document in base.documents.filter(is_permanent=True)]
        permissions = [permission for permission in base.permissions.all()]

        base.pk = None
        base.version = version
        base.save()

        base.documents.set(documents)
        for item in [*actor_relations, *permissions]:
            item.copy_to(license=base)

        return base
    
    def is_equal(self, other):
        return self.dump() == other.dump()

    def dump(self):
        """
        The result of the dump function is intended to be used as a way of 
        comparing versions of licenses. It should contain all relevant information
        that would change the interpretation of a license. LicenseRelations are 
        intentionally ignored when making a comparision since it generally does
        not change the license content.
        """
        return (
            self.dump_state(),
            self.dump_content()
        )
    
    def dump_state(self):
        """
        This data should include anything that is related to the ongoing daily state
        changes expected to be done to a license. Anything included here should not
        be related to the interpretation of the license or permits included in
        the license.
        """
        return (
            self.report_status,
            set((
                relation
                for relation in self.actors.values_list("actor__id", "mednr", "role")
            )),
        )
    
    def dump_content(self):
        """
        This data should include anything that can change the interpretation of the
        license or permits included.
        """
        return (
            self.location,
            self.description,
            self.starts_at,
            self.ends_at,
            set((
                document
                for document in self.documents.filter(is_permanent=True).values_list("id", flat=True)
            )),
            set((
                permission.dump()
                for permission in self.permissions.all()
            )),
        )

    def __str__(self):
        return f"{self.sequence.mnr}:{self.version}"


class Species(ChangeTracking):
    """
    A Species describes a species that is available for licensed activities.
    """

    class Meta:
        verbose_name_plural = "Species"

    name = models.CharField(max_length=512)
    scientific_name = models.CharField(max_length=512, blank=True, default="")
    scientific_code = models.CharField(max_length=128, blank=True, default="")

    def __str__(self):
        return self.name


class LicenseRelation(ChangeTracking):
    """
    A License Relation describes the connection between an actor and a license.

    Only license relations related to a currently active license may be
    updated.

    When creating a new license for a new period the license relations should
    remain connected to the license of the previous period in order to keep
    a complete record of the actors' history. If the same relations are
    needed for the new period then new relation entries should be created.
    """

    actor = models.ForeignKey(Actor, on_delete=models.PROTECT, related_name="licenses")
    license = models.ForeignKey(
        License, on_delete=models.CASCADE, related_name="actors"
    )
    mednr = models.CharField(
        max_length=4,
        validators=[MinLengthValidator(limit_value=4)],
        blank=True,
        default="",
    )
    role = models.PositiveIntegerField(choices=LicenseRoleChoices)

    @property
    def mnr(self):
        return self.license.sequence.mnr

    def copy_to(self, license: License):
        base = LicenseRelation.objects.get(pk=self.pk)
        base.pk = None
        base.license = license
        base.save()
        return base

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["actor", "role", "license"],
                name="unique-actors-for-role-and-license",
            ),
            models.UniqueConstraint(
                fields=["mednr", "license"], name="unique-mednr-for-license"
            ),
        ]


class LicenseCommunication(ChangeTracking):
    """
    A License Communication keeps track of communication related to licenses
    made by the system or triggered by users of the system.
    """

    actor = models.ForeignKey(
        Actor, on_delete=models.PROTECT, related_name="communication"
    )
    license = models.ForeignKey(
        License, on_delete=models.CASCADE, related_name="communication"
    )
    type = models.PositiveIntegerField(choices=CommunicationTypeChoices)
    status = models.PositiveIntegerField(choices=CommunicationStatusChoices)
    note = models.CharField(max_length=512, blank=True, default="")


class LicensePermissionType(ChangeTracking):
    """
    A License Permission Type describes a permission or activity that
    can be granted to a license.
    """

    name = models.CharField(max_length=512)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.name


class LicensePermissionProperty(ChangeTracking):
    """
    A license permission property is a property that can be assigned
    to a license permission in order to further specify the intent.

    The idea is to use this for properties that can be enumerated or
    be treated as boolean properties where an assigned property
    means that the property applies to the current permission.

    A LicensePermissionProperty without a related_type is considered
    a general property and may be assigned to any permission.
    """

    related_type = models.ForeignKey(
        LicensePermissionType, on_delete=models.CASCADE, blank=True, null=True
    )
    name = models.CharField(max_length=512)
    description = models.TextField(blank=True, default="")

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
    activity is needed for the new period then a new license permission should be
    created.
    """

    type = models.ForeignKey(LicensePermissionType, on_delete=models.PROTECT)
    license = models.ForeignKey(
        License, on_delete=models.CASCADE, related_name="permissions"
    )
    location = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    species_list = models.ManyToManyField(Species, blank=True)
    properties = models.ManyToManyField(LicensePermissionProperty, blank=True)

    starts_at = models.DateField(blank=True, null=True)
    ends_at = models.DateField(blank=True, null=True)

    def copy_to(self, license: License):
        base = LicensePermission.objects.get(pk=self.pk)
        properties = list(base.properties.all())
        species_list = list(base.species_list.all())
        base.pk = None
        base.license = license
        base.save()
        base.properties.set(properties)
        base.species_list.set(species_list)
        return base
    
    def dump(self):
        return (
            self.type.id,
            self.location,
            self.description,
            self.starts_at,
            self.ends_at,
            tuple((
                species
                for species in self.species_list.order_by("id").values_list("id", flat=True)
            )),
            tuple((
                prop
                for prop in self.properties.order_by("id").values_list("id", flat=True)
            ))
        )


class PermitDnr(ChangeTracking):
    """
    Stores the DNR (diarienummer) value used for permit rendering.
    Selection logic:
      - choose a row where starts_at <= date <= ends_at and is_active=True
      - if multiple match, pick the most recent (largest starts_at, then created_at)
      - if none match: error (permit must not be created)
    """

    dnr_number = models.CharField(max_length=64)  # keep it generic for now
    starts_at = models.DateField()
    ends_at = models.DateField()
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        constraints = [
            # ensure starts_at itself is unique to avoid ambiguity
            models.UniqueConstraint(
                fields=["starts_at"],
                name="unique_permit_dnr_starts_at",
            ),
        ]
        indexes = [
            models.Index(fields=["is_active", "starts_at", "ends_at"]),
        ]

    def __str__(self):
        return f"{self.dnr_number} ({self.starts_at}-{self.ends_at})"


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
                item_import.fingerprint = fingerprint
                item_import.save()
            return (item_import, False)

        except self.model.DoesNotExist:
            item = item_model.objects.create(**kwargs)
            item_import = self.create(key=key, item=item, fingerprint=fingerprint)
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
                key=key, item=item, fingerprint=self.get_fingerprint(kwargs)
            )
            return (item_import, True)

    def get_fingerprint(self, data):
        fingerprint = hashlib.sha1()
        fingerprint.update(json_serialize(data).encode(encoding="utf8"))
        return fingerprint.hexdigest()

    def get_item_model(self):
        item_field = self.model._meta.get_field("item")
        return item_field.remote_field.model
    
    def get_key(self):
        raise NotImplementedError("ImportModelManager.get_key")


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
        birth_year = actor.get("birth_year")
        type = actor["type"]
        full_name = actor["full_name"]
        year = birth_year or (birth_date.year if birth_date else None)
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


class LicenseImportModelManager(ImportModelManager):
    def get_or_commit(self, license, context, post_commit=None):
        key = self.model.get_context_key(license, context)
        try:
            item_import = self.get(key=key)
            return (item_import, False)
        
        except self.model.DoesNotExist:
            item = license.sequence.commit(license, post_commit)
            try:
                item_import = self.get(item=item)
                return (item_import, False)
            except self.model.DoesNotExist:
                item_import = self.register(item, key)
                return (item_import, True)

    def register(self, item, key):
        item_import = self.create(
            key=key,
            item=item,
            fingerprint=self.get_fingerprint({
                "mnr": item.sequence.mnr,
                "version": item.version
            })
        )
        return item_import


class LicenseImport(ImportTracking):
    item = models.ForeignKey(License, on_delete=models.CASCADE)
    objects = LicenseImportModelManager()

    @staticmethod
    def get_key(**license_data):
        mnr = license_data["sequence"].mnr
        return slugify(f"{mnr}")
    
    @staticmethod
    def get_context_key(lic, context=None):
        key = LicenseImport.get_key(
            sequence=lic.sequence,
        )
        return f"{key}-{context}"
