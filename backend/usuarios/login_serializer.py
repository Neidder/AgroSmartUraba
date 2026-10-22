
from django.contrib.auth import authenticate
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        usuario = authenticate(
            request=self.context.get("request"),
            username=username,
            password=password,
        )

        if not usuario:
            raise serializers.ValidationError(
                "Nombre de usuario o contraseña incorrectos."
            )

        if not usuario.is_active:
            raise serializers.ValidationError(
                "Este usuario está desactivado."
            )

        attrs["usuario"] = usuario
        return attrs
