from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
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
    A ring series is an abstract numbering scheme without a range, see
    RingSequence for a concrete range of rings within a series.
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

    def format_ring_number(self, number: int) -> str:
        return f"{self.prefix}{str(number).zfill(self.number_of_digits)}"


class RingSequenceStatusChoices(models.IntegerChoices):
    PRE_ORDER = (1, _("pre-order"))
    ORDERED = (2, _("ordered"))
    IN_STOCK = (3, _("in stock"))


class RingOrder(ChangeTracking):
    """
    Groups ring sequences that were pre-ordered together.
    """

    note = models.TextField(blank=True, default="")

    def __str__(self):
        return f"Ring order {self.pk}"


class RingSequence(ChangeTracking):
    """
    Describes a concrete range of rings within a ring series, bounded by its
    start and end number. This is the unit that is ordered, stocked, split
    and assigned.
    """

    order = models.ForeignKey(
        RingOrder,
        on_delete=models.PROTECT,
        related_name="sequences",
    )
    series = models.ForeignKey(RingSeries, on_delete=models.PROTECT)
    specification = models.ForeignKey(RingSpecification, on_delete=models.PROTECT)
    start_number = models.PositiveIntegerField()
    end_number = models.PositiveIntegerField()
    status = models.PositiveIntegerField(
        choices=RingSequenceStatusChoices,
        default=RingSequenceStatusChoices.PRE_ORDER,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(start_number__gte=1),
                name="ring_sequence_start_number_gte_1",
            ),
            models.CheckConstraint(
                condition=models.Q(end_number__gte=models.F("start_number")),
                name="ring_sequence_end_number_gte_start_number",
            ),
        ]

    def clean(self):
        errors = {}

        if self.start_number is not None and self.start_number < 1:
            errors["start_number"] = "The start number must be at least 1."

        if (
            self.start_number is not None
            and self.end_number is not None
            and self.end_number < self.start_number
        ):
            errors["end_number"] = "The end number must not be lower than the start number."

        if errors:
            raise ValidationError(errors)

        if self.series_id is None or self.start_number is None or self.end_number is None:
            # Missing fields are reported by clean_fields
            return

        if not RingSequence.validate_fits_series(self.series, self.end_number):
            raise ValidationError({
                "end_number": (
                    f"The end number {self.end_number} does not fit in "
                    f"{self.series.number_of_digits} digits."
                )
            })

        overlapping = RingSequence.find_overlapping(
            self.series, self.start_number, self.end_number, exclude_pk=self.pk
        )
        if overlapping.exists():
            overlapping_str = ", ".join(str(sequence) for sequence in overlapping)
            raise ValidationError({
                "start_number": (
                    f"The sequence {self.first_ring_number} - {self.last_ring_number} "
                    f"overlaps with existing sequences: {overlapping_str}."
                )
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @staticmethod
    def validate_fits_series(series, end_number):
        return end_number < 10 ** series.number_of_digits

    @staticmethod
    def find_overlapping(series, start_number, end_number, exclude_pk=None):
        """
        Returns the sequences sharing printed ring numbers with the given
        range, i.e. sequences in any series with the same prefix and number
        of digits whose range intersects it.
        """
        overlapping = RingSequence.objects.filter(
            series__prefix=series.prefix,
            series__number_of_digits=series.number_of_digits,
            start_number__lte=end_number,
            end_number__gte=start_number,
        ).select_related("series")

        if exclude_pk is not None:
            overlapping = overlapping.exclude(pk=exclude_pk)

        return overlapping

    def overlaps_with(self, other: "RingSequence") -> bool:
        """
        Returns True if this sequence shares printed ring numbers with the
        other sequence. Unlike find_overlapping this also works for
        sequences that have not been saved yet.
        """
        return (
            self.series.prefix == other.series.prefix
            and self.series.number_of_digits == other.series.number_of_digits
            and self.start_number <= other.end_number
            and self.end_number >= other.start_number
        )

    @property
    def quantity(self) -> int:
        return self.end_number - self.start_number + 1

    @property
    def first_ring_number(self) -> str:
        return self.series.format_ring_number(self.start_number)

    @property
    def last_ring_number(self) -> str:
        return self.series.format_ring_number(self.end_number)

    def __str__(self):
        return f"{self.first_ring_number} - {self.last_ring_number}"
