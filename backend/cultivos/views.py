from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import TipoCultivo, Lote
from .serializers import TipoCultivoSerializer, LoteSerializer


class TipoCultivoViewSet(viewsets.ModelViewSet):
    serializer_class = TipoCultivoSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = TipoCultivo.objects.all()

        activo = self.request.query_params.get("activo")

        if activo is not None:
            if activo.lower() == "true":
                queryset = queryset.filter(activo=True)
            elif activo.lower() == "false":
                queryset = queryset.filter(activo=False)

        return queryset


class LoteViewSet(viewsets.ModelViewSet):
    serializer_class = LoteSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Lote.objects.select_related(
            "finca",
            "tipo_cultivo",
        ).all()

        activo = self.request.query_params.get("activo")
        finca_id = self.request.query_params.get("finca")
        tipo_cultivo_id = self.request.query_params.get("tipo_cultivo")

        if activo is not None:
            if activo.lower() == "true":
                queryset = queryset.filter(activo=True)
            elif activo.lower() == "false":
                queryset = queryset.filter(activo=False)

        if finca_id:
            queryset = queryset.filter(finca_id=finca_id)

        if tipo_cultivo_id:
            queryset = queryset.filter(tipo_cultivo_id=tipo_cultivo_id)

        return queryset
