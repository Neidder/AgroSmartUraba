from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.authtoken.models import Token

Usuario = get_user_model()


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"}
    )

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "rol",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def validate(self, attrs):
        """Protecciones del servidor: nadie debe quedarse sin acceso de administrador."""
        request = self.context.get("request")
        instancia = self.instance

        if instancia is not None:
            nuevo_rol = attrs.get("rol", instancia.rol)
            sigue_activo = attrs.get("is_active", instancia.is_active)
            cambia_rol = nuevo_rol != instancia.rol
            se_archiva = instancia.is_active and not sigue_activo

            if (
                request is not None
                and instancia.pk == request.user.pk
                and (cambia_rol or se_archiva)
            ):
                raise serializers.ValidationError(
                    "No puedes archivar tu propia cuenta ni cambiar tu propio rol."
                )

            deja_de_ser_admin = (
                instancia.rol == Usuario.Rol.ADMINISTRADOR
                and instancia.is_active
                and (cambia_rol or se_archiva)
            )
            if deja_de_ser_admin:
                quedan_otros = (
                    Usuario.objects.filter(
                        rol=Usuario.Rol.ADMINISTRADOR,
                        is_active=True,
                    )
                    .exclude(pk=instancia.pk)
                    .exists()
                )
                if not quedan_otros:
                    raise serializers.ValidationError(
                        "Debe quedar al menos un administrador activo."
                    )

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)

        if not password:
            raise serializers.ValidationError({
                "password": "La contraseña es obligatoria."
            })

        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)

        if password:
            instance.set_password(password)

        instance.save()

        # Si un administrador restablece la contraseña de OTRA persona,
        # se cierran las sesiones que esa persona tenía abiertas.
        request = self.context.get("request")
        es_otra_persona = request is None or request.user.pk != instance.pk
        if password and es_otra_persona:
            Token.objects.filter(user=instance).delete()

        return instance


class PerfilSerializer(serializers.ModelSerializer):
    """Datos del usuario que inició sesión. Solo permite editar nombre y correo."""

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "rol",
            "date_joined",
        ]
        read_only_fields = ["id", "username", "rol", "date_joined"]