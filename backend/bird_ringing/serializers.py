from rest_framework import serializers


class ChangeTrackingSerializer(serializers.Serializer):
    created_by = serializers.HiddenField(default=serializers.CreateOnlyDefault(serializers.CurrentUserDefault()))
    updated_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    def update(self, instance, validated_data):
        request = self.context.get("request")
        if request is not None:
            validated_data["updated_by"] = request.user
        return super().update(instance, validated_data)