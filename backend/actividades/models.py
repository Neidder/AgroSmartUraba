
from django.conf import settings
from django.db import models
from cultivos.models import Lote


class Actividad(models.Model):

    class TipoActividad(models.TextChoices):
        PREPARACION_TERRENO = "PREPARACION", "Preparación del terreno"
        SIEMBRA = "SIEMBRA", "Siembra"
        RIEGO = "RIEGO", "Riego"
        FERTILIZACION = "FERTILIZACION", "Fertilización"
        CONTROL_PLAGAS = "CONTROL_PLAGAS", "Control de plagas"
        LIMPIEZA = "LIMPIEZA", "Limpieza"
        PODA = "PODA", "Poda"
        COSECHA = "COSECHA", "Cosecha"
        OTRA = "OTRA", "Otra"

    lote = models.ForeignKey(
        Lote,
        on_delete=models.PROTECT,
        related_name="actividades",
    )

    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="actividades_agricolas",
    )

    tipo = models.CharField(
        max_length=20,
        choices=TipoActividad.choices,
    )

    descripcion = models.TextField()
    fecha_actividad = models.DateField()
    costo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    observaciones = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "actividades_agricolas"
        ordering = ["-fecha_actividad"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(costo__gte=0),
                name="actividad_costo_no_negativo",
            ),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.fecha_actividad}"
