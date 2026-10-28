from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models


class Venta(models.Model):
    class Estado(models.TextChoices):
        REGISTRADA = "REGISTRADA", "Registrada"
        ANULADA = "ANULADA", "Anulada"

    productor = models.ForeignKey(
        "productores.Productor",
        on_delete=models.PROTECT,
        related_name="ventas",
    )
    fecha_venta = models.DateField()
    comprador_nombre = models.CharField(max_length=150, blank=True)
    comprador_documento = models.CharField(max_length=30, blank=True)
    comprador_contacto = models.CharField(max_length=100, blank=True)
    estado = models.CharField(
        max_length=12,
        choices=Estado.choices,
        default=Estado.REGISTRADA,
    )
    motivo_anulacion = models.TextField(blank=True)
    registrada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ventas_registradas",
    )
    anulada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ventas_anuladas",
        null=True,
        blank=True,
    )
    fecha_anulacion = models.DateTimeField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ventas"
        ordering = ["-fecha_venta", "-id"]

    @property
    def total(self):
        suma = sum(
            (detalle.cantidad_precio for detalle in self.detalles.all()),
            Decimal("0.00"),
        )
        return suma.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    def __str__(self):
        return f"Venta {self.pk} - {self.fecha_venta}"


class DetalleVenta(models.Model):
    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE,
        related_name="detalles",
    )
    cosecha = models.ForeignKey(
        "cosechas.Cosecha",
        on_delete=models.PROTECT,
        related_name="detalles_venta",
    )
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "detalles_venta"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad__gt=0),
                name="detalle_venta_cantidad_mayor_cero",
            ),
            models.CheckConstraint(
                condition=models.Q(precio_unitario__gt=0),
                name="detalle_venta_precio_mayor_cero",
            ),
        ]

    @property
    def cantidad_precio(self):
        return (self.cantidad * self.precio_unitario).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    @property
    def nombre_producto(self):
        return self.cosecha.lote.tipo_cultivo.nombre

    @property
    def unidad_medida(self):
        return self.cosecha.unidad_medida

    def __str__(self):
        return f"{self.nombre_producto} - {self.cantidad}"
