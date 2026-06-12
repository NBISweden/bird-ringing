from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.permissions import DjangoModelPermissions


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
            raise serializers.ValidationError("Expected an object.")
        if "id" not in data:
            raise serializers.ValidationError({"id": "This field is required."})

        return super().to_internal_value(data["id"])