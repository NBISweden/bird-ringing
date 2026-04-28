from rest_framework import serializers, viewsets
from rest_framework.response import Response


class LabeledChoiceField(serializers.Field):
    def __init__(self, choices, **kwargs):
        self.choices = choices
        super().__init__(**kwargs)

    def to_representation(self, obj):
        if obj is not None:
            return {
                "id": str(self.choices(obj).name).lower(),
                "label": self.choices(obj).label,
            }
        else:
            return None
    
    def to_internal_value(self, data):
        for choice_value, choice in self.choices.__members__.items():
            if data == choice.name:
                return choice.value
        raise serializers.ValidationError("Choice not valid.")


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
