from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated

from cultivos.models import Lote
from .models import Actividad
from .serializers import ActividadSerializer


class FiltrosActividadSerializer(serializers.Serializer):
    lote = serializers.PrimaryKeyRelatedField(
        queryset=Lote.objects.all(),
        required=False,
    )
    tipo = serializers.ChoiceField(
        choices=Actividad.TipoActividad.choices,
        required=False,
    )
    activo = serializers.BooleanField(required=False)
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


class ActividadViewSet(viewsets.ModelViewSet):
    serializer_class = ActividadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Actividad.objects.select_related(
            "lote",
            "responsable",
        )
        filtros = FiltrosActividadSerializer(data=self.request.query_params)
        filtros.is_valid(raise_exception=True)
        valores = filtros.validated_data

        if "lote" in valores:
            queryset = queryset.filter(lote=valores["lote"])
        if "tipo" in valores:
            queryset = queryset.filter(tipo=valores["tipo"])
        if "activo" in self.request.query_params:
            queryset = queryset.filter(activo=valores["activo"])
        if "desde" in valores:
            queryset = queryset.filter(fecha_actividad__gte=valores["desde"])
        if "hasta" in valores:
            queryset = queryset.filter(fecha_actividad__lte=valores["hasta"])

        busqueda = self.request.query_params.get("buscar", "").strip()
        if busqueda:
            queryset = queryset.filter(
                Q(descripcion__icontains=busqueda)
                | Q(lote__nombre__icontains=busqueda)
                | Q(responsable__username__icontains=busqueda)
                | Q(responsable__first_name__icontains=busqueda)
                | Q(responsable__last_name__icontains=busqueda)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(responsable=self.request.user)

    def destroy(self, request, *args, **kwargs):
        self.get_object()
        raise MethodNotAllowed(
            "DELETE",
            "Las actividades se deben archivar para conservar su historial.",
        )
