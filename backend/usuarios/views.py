from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated
from .models import Usuario
from .serializers import UsuarioSerializer
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .login_serializer import LoginSerializer
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Usuario, SolicitudAcceso


class EsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.rol == Usuario.Rol.ADMINISTRADOR
        )


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by("id")
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]

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
    
    

@api_view(["POST"])
@permission_classes([AllowAny])
def solicitar_acceso(request):
    nombre = str(request.data.get("nombre", "")).strip()
    apellido = str(request.data.get("apellido", "")).strip()
    correo = str(request.data.get("correo", "")).strip().lower()
    motivo = str(request.data.get("motivo", "")).strip()

    if not all([nombre, apellido, correo, motivo]):
        return Response(
            {"error": "Todos los campos son obligatorios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = serializers.EmailField()
    try:
        correo = serializer.run_validation(correo)
    except serializers.ValidationError:
        return Response(
            {"error": "Ingresa un correo electrónico válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    solicitud = SolicitudAcceso.objects.create(
        nombre=nombre,
        apellido=apellido,
        correo=correo,
        motivo=motivo,
    )

    return Response(
        {
            "mensaje": "Tu solicitud fue recibida y está pendiente de revisión.",
            "id": solicitud.id,
        },
        status=status.HTTP_201_CREATED,
    )



@api_view(["POST"])
@permission_classes([AllowAny])
def solicitar_recuperacion(request):
    username = str(request.data.get("username", "")).strip()
    correo = str(request.data.get("correo", "")).strip().lower()

    if not username or not correo:
        return Response(
            {"error": "Ingresa tu usuario y correo electrónico."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    UsuarioModel = get_user_model()

    usuario = UsuarioModel.objects.filter(
        username__iexact=username,
        email__iexact=correo,
        is_active=True,
    ).first()

    # La respuesta no revela si el usuario o correo existen.
    if usuario:
        uid = urlsafe_base64_encode(force_bytes(usuario.pk))
        token = default_token_generator.make_token(usuario)

        enlace = (
            f"{settings.FRONTEND_URL}/restablecer-contrasena"
            f"?uid={uid}&token={token}"
        )

        send_mail(
            subject="Recuperación de contraseña - AgroSmart Urabá",
            message=(
                f"Hola {usuario.first_name or usuario.username}.\n\n"
                "Recibimos una solicitud para restablecer tu contraseña.\n"
                f"Abre este enlace para continuar:\n{enlace}\n\n"
                "Si no solicitaste este cambio, ignora este mensaje."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[usuario.email],
            fail_silently=False,
        )

    return Response(
        {
            "mensaje": (
                "Si el usuario y el correo corresponden a una cuenta activa, "
                "recibirás instrucciones para recuperar el acceso."
            )
        },
        status=status.HTTP_200_OK,
    )



@api_view(["POST"])
@permission_classes([AllowAny])
def restablecer_contrasena(request):
    uid = request.data.get("uid")
    token = request.data.get("token")
    nueva_contrasena = request.data.get("nueva_contrasena")

    if not uid or not token or not nueva_contrasena:
        return Response(
            {"error": "Faltan datos para restablecer la contraseña."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(nueva_contrasena) < 8:
        return Response(
            {"error": "La contraseña debe tener al menos 8 caracteres."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        uid_decodificado = force_str(urlsafe_base64_decode(uid))
        usuario = get_user_model().objects.get(pk=uid_decodificado)
    except (ValueError, TypeError, OverflowError, get_user_model().DoesNotExist):
        return Response(
            {"error": "El enlace no es válido o ha expirado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not usuario.is_active or not default_token_generator.check_token(usuario, token):
        return Response(
            {"error": "El enlace no es válido o ha expirado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    usuario.set_password(nueva_contrasena)
    usuario.save()

    # Invalidar los tokens de sesión anteriores de este usuario.
    Token.objects.filter(user=usuario).delete()

    return Response(
        {"mensaje": "Contraseña actualizada. Ya puedes iniciar sesión."},
        status=status.HTTP_200_OK,
    )
