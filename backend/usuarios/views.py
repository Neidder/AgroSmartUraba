from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from .models import Usuario
from .serializers import UsuarioSerializer
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .login_serializer import LoginSerializer

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by("id")
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()

        rol = self.request.query_params.get("rol")
        activo = self.request.query_params.get("activo")

        if rol:
            queryset = queryset.filter(rol=rol)

        if activo is not None:
            if activo.lower() in ["true", "1"]:
                queryset = queryset.filter(is_active=True)
            elif activo.lower() in ["false", "0"]:
                queryset = queryset.filter(is_active=False)

        return queryset
    
@api_view(["POST"])
@permission_classes([AllowAny])
def iniciar_sesion(request):
    serializer = LoginSerializer(
        data=request.data,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)

    usuario = serializer.validated_data["usuario"]
    token, _ = Token.objects.get_or_create(user=usuario)

    return Response({
        "token": token.key,
        "usuario": {
            "id": usuario.id,
            "username": usuario.username,
            "nombre": usuario.first_name,
            "apellido": usuario.last_name,
            "rol": usuario.rol,
        },
    }, status=status.HTTP_200_OK)
