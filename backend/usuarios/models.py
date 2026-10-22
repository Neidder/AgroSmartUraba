
from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):

    class Rol(models.TextChoices):
        ADMINISTRADOR = "ADMINISTRADOR", "Administrador"
        TRABAJADOR = "TRABAJADOR", "Trabajador"

    rol = models.CharField(
        max_length=20,
        choices=Rol.choices,
        default=Rol.TRABAJADOR,
    )

    def __str__(self):
        return f"{self.username} - {self.get_rol_display()}"
