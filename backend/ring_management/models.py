from django.db import models
from bird_ringing.models import ChangeTracking
from licensing.models import LicenseSequence
from django.utils.translation import gettext_lazy as _


class NamedEntity(models.Model):
    name = models.CharField(max_length=64)

    class Meta:
        abstract = True
    
    def __str__(self):
        return self.name


class RingStatusChoices(models.IntegerChoices):
    IN_STOCK = (1, _("in-stock"))
    ASSIGNED = (2, _("assigned"))
    IN_USE = (3, _("in-use"))
    OBSERVED = (4, _("observed"))
    DECOMMISSIONED = (5, _("decommissioned"))


class RingOrderStatusChoices(models.IntegerChoices):
    PREPARED = (1, _("prepared"))
    ORDERED = (2, _("ordered"))
    DELIVERED = (3, _("delivered"))


class RingVariant(NamedEntity):
    """
    Describes a ring variant primarily in terms of shape.
    """


class RingMaterial(NamedEntity):
    """
    Describes ring materials primarily choices of metal.
    """


class RingTypeCode(NamedEntity):
    """
    Describes a code which in brad terms relates to the diameter of a ring.
    """


class RingColor(NamedEntity):
    """
    Describes a ring color.
    """


class RingModel(ChangeTracking): # Maybe name this RingSpecification
    """
    Describes the physical properties of a ring.
    """

    name = models.CharField(max_length=256)
    type_code = models.ForeignKey(RingTypeCode, on_delete=models.PROTECT)
    variant = models.ForeignKey(RingVariant, on_delete=models.PROTECT)
    material = models.ForeignKey(RingMaterial, on_delete=models.PROTECT)
    diameter = models.FloatField()
    thickness = models.FloatField()
    weight = models.FloatField()
    height = models.FloatField()

    def __str__(self):
        return self.name


class RingSeries(ChangeTracking):
    """
    Describes properties related to a ring series or identifiers carried on a ring.
    """

    prefix = models.CharField(max_length=8)
    number_of_digits = models.PositiveIntegerField()
    is_euring = models.BooleanField()
    has_web_address = models.BooleanField()
    color = models.ForeignKey(RingColor, on_delete=models.PROTECT, blank=True, null=True)

    def __str__(self):
        ring_num = f"{self.prefix}{"".zfill(self.number_of_digits)}"
        props = [
            p
            for p in [
                "EURING" if self.is_euring else None,
                "Web" if self.has_web_address else None,
                None if self.color is None else str(self.color),
            ]
            if p is not None
        ]
        props_str = f" ({', '.join(props)})" if len(props) > 0 else ""
        return f"{ring_num}{props_str}"


class RingOrder(ChangeTracking):
    """
    Describes and order or a prepared order to be used for ordering rings with specified model properties
    and series properties.
    """

    status = models.PositiveIntegerField(choices=RingOrderStatusChoices, default=RingOrderStatusChoices.PREPARED)
    ring_model = models.ForeignKey(RingModel, on_delete=models.PROTECT, related_name="orders")
    ring_series = models.ForeignKey(RingSeries, on_delete=models.PROTECT, related_name="orders", null=True, default=None, blank=True)
    start_number = models.PositiveIntegerField(null=True, default=None, blank=True)
    end_number = models.PositiveIntegerField(null=True, default=None, blank=True)
    external_reference = models.CharField(max_length=2048, null=True, default=None, blank=True)
    note = models.TextField(blank=True, default="")

    ordered_at = models.DateTimeField(null=True, default=None, blank=True)
    delivered_at = models.DateTimeField(null=True, default=None, blank=True)


class Ring(ChangeTracking):
    """
    Describes each ring with associated series and actual number for identity tracking and 
    all properties relevant for aggergating ring production statistics.
    """

    model = models.ForeignKey(RingModel, on_delete=models.PROTECT)
    series = models.ForeignKey(RingSeries, on_delete=models.PROTECT, related_name="rings")
    number = models.PositiveIntegerField()
    status = models.PositiveIntegerField(
        choices=RingStatusChoices, default=RingStatusChoices.IN_STOCK
    ) # Would it be nice to move this property somewhere else in order to make sure that each entry in this table is truly immutable?
    order = models.ForeignKey(RingOrder, on_delete=models.PROTECT, related_name="rings")
    license = models.ForeignKey(
        LicenseSequence,
        on_delete=models.PROTECT,
        related_name="rings",
        null=True,
        default=None,
    )

