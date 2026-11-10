from django.db import models
from bird_ringing.models import ChangeTracking


class NamedEntity(models.Model):
    name = models.CharField(max_length=64)

    class Meta:
        abstract = True
    
    def __str__(self):
        return self.name


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


class RingSpecification(ChangeTracking):
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
    Describes properties related to a ring series and identifiers carried on a ring.
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

