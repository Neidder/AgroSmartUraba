
from django.db import models
from cultivos.models import Lote


class CostoProduccion(models.Model):

    class CategoriaCosto(models.TextChoices):
        SEMILLAS = "SEMILLAS", "Semillas"
        FERTILIZANTES = "FERTILIZANTES", "Fertilizantes"
        PLAGUICIDAS = "PLAGUICIDAS", "Plaguicidas"
        MANO_OBRA = "MANO_OBRA", "Mano de obra"
        TRANSPORTE = "TRANSPORTE", "Transporte"
        RIEGO = "RIEGO", "Riego"
        HERRAMIENTAS = "HERRAMIENTAS", "Herramientas"
        OTRO = "OTRO", "Otro"

    lote = models.ForeignKey(
        Lote,
        on_delete=models.PROTECT,
        related_name="costos",
    )

    categoria = models.CharField(
        max_length=20,
        choices=CategoriaCosto.choices,
    )

    descripcion = models.CharField(max_length=200)

    monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    fecha_gasto = models.DateField()

    observaciones = models.TextField(blank=True)

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "costos_produccion"
        ordering = ["-fecha_gasto"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(monto__gt=0),
                name="costo_monto_mayor_cero",
            ),
        ]

    def __str__(self):
        return f"{self.descripcion} - {self.monto}"


class PerdidaAgricola(models.Model):

    class MotivoPerdida(models.TextChoices):
        PLAGAS = "PLAGAS", "Plagas"
        ENFERMEDAD = "ENFERMEDAD", "Enfermedad"
        CLIMA = "CLIMA", "Condiciones climáticas"
        SEQUIA = "SEQUIA", "Sequía"
        INUNDACION = "INUNDACION", "Inundación"
        DANIO_MANUAL = "DANIO_MANUAL", "Daño durante labores"
        OTRO = "OTRO", "Otro"

    lote = models.ForeignKey(
        Lote,
        on_delete=models.PROTECT,
        related_name="perdidas",
    )

    motivo = models.CharField(
        max_length=20,
        choices=MotivoPerdida.choices,
    )

    descripcion = models.TextField()

    cantidad_perdida = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    unidad_medida = models.CharField(
        max_length=20,
        default="KG",
    )

    fecha_perdida = models.DateField()

    costo_estimado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    observaciones = models.TextField(blank=True)

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "perdidas_agricolas"
        ordering = ["-fecha_perdida"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad_perdida__gt=0),
                name="perdida_cantidad_mayor_cero",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(costo_estimado__isnull=True)
                    | models.Q(costo_estimado__gte=0)
                ),
                name="perdida_costo_no_negativo",
            ),
        ]

    def __str__(self):
        return f"Pérdida en {self.lote.nombre} - {self.fecha_perdida}"
