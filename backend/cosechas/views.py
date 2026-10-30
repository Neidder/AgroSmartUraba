from django.db import transaction
from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated

from cultivos.models import Lote
from .models import Cosecha
from .serializers import CosechaSerializer


class FiltrosCosechaSerializer(serializers.Serializer):
    lote = serializers.PrimaryKeyRelatedField(
        queryset=Lote.objects.all(),
        required=False,
    )
    unidad_medida = serializers.ChoiceField(
        choices=Cosecha.UnidadMedida.choices,
        required=False,
    )
    fecha_cosecha = serializers.DateField(required=False)
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)

    def validate(self, attrs):
        desde = attrs.get("desde")
        hasta = attrs.get("hasta")
        if desde and hasta and desde > hasta:
            raise serializers.ValidationError(
                {"hasta": "La fecha final debe ser igual o posterior a la inicial."}
            )
        return attrs


class CosechaViewSet(viewsets.ModelViewSet):
    serializer_class = CosechaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Cosecha.objects.select_related(
            "lote",
            "lote__tipo_cultivo",
        )
        filtros = FiltrosCosechaSerializer(data=self.request.query_params)
        filtros.is_valid(raise_exception=True)
        valores = filtros.validated_data

        if "lote" in valores:
            queryset = queryset.filter(lote=valores["lote"])
        if "unidad_medida" in self.request.query_params:
            queryset = queryset.filter(
                unidad_medida=valores["unidad_medida"],
            )
        if "fecha_cosecha" in valores:
            queryset = queryset.filter(
                fecha_cosecha=valores["fecha_cosecha"],
            )
        if "desde" in valores:
            queryset = queryset.filter(fecha_cosecha__gte=valores["desde"])
        if "hasta" in valores:
            queryset = queryset.filter(fecha_cosecha__lte=valores["hasta"])

        busqueda = self.request.query_params.get("buscar", "").strip()
        if busqueda:
            queryset = queryset.filter(
                Q(lote__nombre__icontains=busqueda)
                | Q(lote__tipo_cultivo__nombre__icontains=busqueda)
                | Q(lote__finca__nombre__icontains=busqueda)
                | Q(observaciones__icontains=busqueda)
            )

        if self.action in {"update", "partial_update"}:
            queryset = queryset.select_for_update()

        return queryset

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.get_object()
        raise MethodNotAllowed(
            "DELETE",
            "Las cosechas no se pueden borrar para conservar su historial.",
        )
