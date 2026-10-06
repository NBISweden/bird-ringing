from rest_framework import serializers, viewsets, filters, pagination
from rest_framework.decorators import action
from collections.abc import Callable
from typing import Iterable, Tuple, Any
from rest_framework.response import Response
from rest_framework.permissions import DjangoModelPermissions
from collections import OrderedDict

class NameBasedChoiceField(serializers.Field):
    def __init__(self, choices, **kwargs):
        self.choices = choices
        super().__init__(**kwargs)

    def to_representation(self, obj):
        if obj is not None:
            return self._to_id(self.choices(obj).name)
        else:
            return None
    
    def to_internal_value(self, data):
        try:
            choice = self.choices(data)
            return choice.value
        except ValueError:
            pass

        for choice_value, choice in self.choices.__members__.items():
            if data == self._to_id(choice.name):
                return choice.value
        raise serializers.ValidationError(f"Choice, '{data}', is not valid.")

    def _to_id(self, value):
        return str(value).lower()


class LabeledChoiceSerializer(serializers.Serializer):
    """
    Serializes a choice into an identifiable and labeled item.
    It will use a processed name as the id and the label as the label.
    """
    id = serializers.SerializerMethodField(read_only=True)
    label = serializers.SerializerMethodField(read_only=True)
    
    def get_id(self, obj):
        return self.process_id(obj.name)
    
    def get_label(self, obj):
        return obj.label
    
    def process_id(self, id):
        return str(id).lower()


class LabeledChoiceViewset(viewsets.ViewSet):
    """
    A viewset that returns a full list representation of a choice class.
    It will pass the choices to the serializer class.
    """
    serializer_class = LabeledChoiceSerializer

    def get_choices(self):
        return [
            choice
            for choice in self.choices.__members__.values()
        ]

    def get_serializer_class(self):
        return self.serializer_class

    def list(self, request):
        choices = self.get_choices()
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(choices, many=True)
        return Response(serializer.data)


class DjangoProtectedModelPermissions(DjangoModelPermissions):
    """
    Shared permission model for protected data.
    """

    perms_map = {
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": [],
        "POST": ["%(app_label)s.add_%(model_name)s"],
        "PUT": ["%(app_label)s.change_%(model_name)s"],
        "PATCH": ["%(app_label)s.change_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }


class RelatedFieldSerializer(serializers.PrimaryKeyRelatedField):
    default_error_messages = {
        "invalid": "Expected an object.",
        "missing_id": "Expected an 'id' key.",
    }

    def __init__(self, *args, serializer_class=None, **kwargs):
        if serializer_class is None:
            raise TypeError("serializer_class is required")
        self.serializer_class = serializer_class
        super().__init__(*args, **kwargs)
    
    def use_pk_only_optimization(self):
        return False

    def to_representation(self, value):
        serializer = self.serializer_class(value, context=getattr(self, "context", {}))
        return serializer.data

    def to_internal_value(self, data):
        queryset = self.get_queryset()
        model_class = queryset.model if queryset is not None else None

        if model_class is not None and isinstance(data, model_class):
            return data
    
        if not isinstance(data, dict):
            self.fail("invalid")
        if "id" not in data:
            self.fail("missing_id")

        return super().to_internal_value(data["id"])

class ValueListMixin:
    """
    The ValueListMixin adds a value_list action which returns a list of 
    values from a ModelViewSet. The intent is to allow the use of the
    existing filtering options of a ModelViewSet while enabling fetching
    single values for every filtered entry.
    """

    @action(detail=False, methods=["get"], url_path=r"value_list/(?P<value_id>\w+)",)
    def value_list(self, request, value_id):
        """
        Provides a REST API action which fetches a specific value from each entry
        of a list of Model objects. It respects the filtering options of the
        associated viewset.
        """
        available_value_ids = self.get_available_value_ids()
        if value_id not in available_value_ids:
            return Response({"detail": f"The value '{value_id}' can not be aggregated for this resource."}, status=404)
        
        value_source = available_value_ids[value_id]

        queryset = self.get_queryset()
        queryset = self.filter_queryset(queryset)

        values = list(self.get_value_list(queryset, value_source))

        return Response({
            "values": {
                entry_id: value
                for (entry_id, value) in values
            },
            "value_id": value_id
        })

    def get_available_value_ids(self) -> dict[str, str | Callable]:
        """
        The available value ids provides a mapping of input param names
        to the source of the value from the queryset. When the dict values
        are of type 'str' the lookup will be done using 'value_list' and
        when the type is 'Callable' the callable function is expected
        to provide the result.
        """
        return {}
    
    def get_value_list(self, queryset, value_source) -> Iterable[Tuple[str | int, Any]]:
        """
        Takes a queryset and a value source specification and returns an
        iterable with a tuple mapping from the owner entry to the fetched value.
        """
        if isinstance(value_source, str):
            values = list(queryset.values_list(self.lookup_field, value_source))
        elif callable(value_source):
            values = value_source(queryset)
        return values

def parse_csv_string(csv_str: str):
    return [v.strip() for v in csv_str.split(",")]

class IdSelectionFilter(filters.BaseFilterBackend):
    """
    Filter that allows filtering on object ids
    """

    def filter_queryset(self, request, queryset, view):
        id_filter_target = getattr(view, "id_filter_target", "id")
        id_filter_max = getattr(view, "id_filter_max", 100)

        filter_ids = set(
            [id for id in parse_csv_string(request.GET.get("ids", "")) if id]
        )

        if len(filter_ids) > id_filter_max:
            raise serializers.ValidationError(
                {
                    "ids": f"Too many ids in list {len(filter_ids)}. Maximum limit is {id_filter_max}"
                }
            )

        if len(filter_ids) > 0:
            filter = {f"{id_filter_target}__in": filter_ids}
            return queryset.filter(**filter)
        else:
            return queryset


class DynamicOrderingFilter(filters.BaseFilterBackend):
    """
    Filter that allows dynamic user controlled ordering
    """

    def filter_queryset(self, request, queryset, view):
        default_ordering = getattr(view, "default_ordering", [])
        base_allowed_ordering = getattr(view, "allowed_ordering", [])
        allowed_ordering = set(base_allowed_ordering)
        order_by = [
            o
            for o in parse_csv_string(request.GET.get("ordering", ""))
            if o in allowed_ordering
        ]
        order_by = order_by if len(order_by) > 0 else default_ordering
        return queryset.order_by(*order_by)

    @staticmethod
    def include_reverse(items: list[str]):
        return [f"{d}{o}" for o in items for d in ["", "-"]]


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("count", self.page.paginator.count),
                    (
                        "num_pages",
                        self.page.paginator.num_pages,
                    ),  # Add total number of pages
                    ("next", self.get_next_link()),
                    ("previous", self.get_previous_link()),
                    ("results", data),
                ]
            )
        )