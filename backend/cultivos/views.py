from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated
from .models import TipoCultivo, Lote
from .serializers import TipoCultivoSerializer, LoteSerializer


class TipoCultivoViewSet(viewsets.ModelViewSet):
    serializer_class = TipoCultivoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = TipoCultivo.objects.all()

        activo = self.request.query_params.get("activo")
        busqueda = self.request.query_params.get("buscar")

        if activo is not None:
            if activo.lower() == "true":
                queryset = queryset.filter(activo=True)
            elif activo.lower() == "false":
                queryset = queryset.filter(activo=False)

        if busqueda:
            queryset = queryset.filter(nombre__icontains=busqueda)

        return queryset

    def destroy(self, request, *args, **kwargs):
        self.get_object()
        raise MethodNotAllowed(
            "DELETE",
            "Los tipos de cultivo se deben desactivar para conservar su historial.",
        )


class LoteViewSet(viewsets.ModelViewSet):
    serializer_class = LoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Lote.objects.select_related(
            "finca",
            "tipo_cultivo",
        ).order_by("nombre")

        activo = self.request.query_params.get("activo")
        finca_id = self.request.query_params.get("finca")
        tipo_cultivo_id = self.request.query_params.get("tipo_cultivo")
        busqueda = self.request.query_params.get("buscar")

        if activo is not None:
            if activo.lower() == "true":
                queryset = queryset.filter(activo=True)
            elif activo.lower() == "false":
                queryset = queryset.filter(activo=False)

        if finca_id:
            queryset = queryset.filter(finca_id=finca_id)

        if tipo_cultivo_id:
            queryset = queryset.filter(tipo_cultivo_id=tipo_cultivo_id)

        if busqueda:
            queryset = queryset.filter(
                Q(nombre__icontains=busqueda)
                | Q(finca__nombre__icontains=busqueda)
                | Q(tipo_cultivo__nombre__icontains=busqueda)
            )

        return queryset

    def destroy(self, request, *args, **kwargs):
        self.get_object()
        raise MethodNotAllowed(
            "DELETE",
            "Los lotes se deben desactivar para conservar cosechas e historial.",
        )
