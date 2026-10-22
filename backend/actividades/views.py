from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Actividad
from .serializers import ActividadSerializer


class ActividadViewSet(viewsets.ModelViewSet):
    serializer_class = ActividadSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Actividad.objects.select_related(
            "lote",
            "responsable",
        ).all()

        lote_id = self.request.query_params.get("lote")
        responsable_id = self.request.query_params.get("responsable")
        tipo = self.request.query_params.get("tipo")

        if lote_id:
            queryset = queryset.filter(lote_id=lote_id)

        if responsable_id:
            queryset = queryset.filter(responsable_id=responsable_id)

        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset
