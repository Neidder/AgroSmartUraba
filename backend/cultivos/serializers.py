
from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from fincas.models import Finca
from .models import TipoCultivo, Lote


class TipoCultivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCultivo
        fields = "__all__"
        read_only_fields = ["id"]


class LoteSerializer(serializers.ModelSerializer):
    nombre_finca = serializers.CharField(
        source="finca.nombre",
        read_only=True,
    )
    nombre_tipo_cultivo = serializers.CharField(
        source="tipo_cultivo.nombre",
        read_only=True,
    )

    class Meta:
        model = Lote
        fields = "__all__"
        read_only_fields = ["id", "fecha_creacion"]
        extra_kwargs = {
            "hectareas": {
                "min_value": Decimal("0.01"),
                "max_digits": 10,
                "decimal_places": 2,
            },
        }

    def validate(self, attrs):
        finca = attrs.get("finca", self.instance.finca if self.instance else None)
        tipo_cultivo = attrs.get(
            "tipo_cultivo",
            self.instance.tipo_cultivo if self.instance else None,
        )
        activo = attrs.get("activo", self.instance.activo if self.instance else True)
        hectareas = attrs.get(
            "hectareas",
            self.instance.hectareas if self.instance else None,
        )
        fecha_siembra = attrs.get(
            "fecha_siembra",
            self.instance.fecha_siembra if self.instance else None,
        )
        fecha_fin_estimada = attrs.get(
            "fecha_fin_estimada",
            self.instance.fecha_fin_estimada if self.instance else None,
        )

        activando = self.instance is not None and not self.instance.activo and activo
        if finca and not finca.activa and (
            self.instance is None
            or self.instance.finca_id != finca.pk
            or activando
        ):
            raise serializers.ValidationError(
                {"finca": "Selecciona una finca activa."}
            )

        if tipo_cultivo and not tipo_cultivo.activo and (
            self.instance is None
            or self.instance.tipo_cultivo_id != tipo_cultivo.pk
            or activando
        ):
            raise serializers.ValidationError(
                {"tipo_cultivo": "Selecciona un tipo de cultivo activo."}
            )

        if (
            fecha_siembra
            and fecha_fin_estimada
            and fecha_fin_estimada < fecha_siembra
        ):
            raise serializers.ValidationError(
                {
                    "fecha_fin_estimada": (
                        "La fecha estimada no puede ser anterior a la fecha de siembra."
                    )
                }
            )

        if activo and finca and hectareas:
            lotes_activos = Lote.objects.filter(finca=finca, activo=True)
            if self.instance:
                lotes_activos = lotes_activos.exclude(pk=self.instance.pk)

            area_ocupada = lotes_activos.aggregate(
                total=Sum("hectareas")
            )["total"] or Decimal("0")
            if area_ocupada + hectareas > finca.hectareas:
                raise serializers.ValidationError(
                    {
                        "hectareas": (
                            "El área de los lotes activos supera el área registrada "
                            f"para la finca ({finca.hectareas} ha). "
                            f"Área disponible: {finca.hectareas - area_ocupada} ha."
                        )
                    }
                )

        return attrs
