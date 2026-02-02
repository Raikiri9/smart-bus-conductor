from django.db import models


class PassengerTrip(models.Model):
	STATUS_CHOICES = [
		('active', 'Active'),
		('completed', 'Completed'),
		('cancelled', 'Cancelled'),
	]

	ticket_id = models.CharField(max_length=100, unique=True, primary_key=True)
	origin = models.CharField(max_length=255)
	destination = models.CharField(max_length=255)
	fare = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	distance_km = models.FloatField(null=True, blank=True)

	origin_lat = models.FloatField(null=True, blank=True)
	origin_lon = models.FloatField(null=True, blank=True)
	destination_lat = models.FloatField(null=True, blank=True)
	destination_lon = models.FloatField(null=True, blank=True)

	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['status', '-created_at']),
			models.Index(fields=['ticket_id']),
		]

	def __str__(self):
		return f"{self.ticket_id}: {self.origin} → {self.destination}"


class Trip(models.Model):
	PAYMENT_STATUS_CHOICES = [
		('pending', 'Pending'),
		('processing', 'Processing'),
		('success', 'Success'),
		('failed', 'Failed'),
	]

	PAYMENT_METHOD_CHOICES = [
		('ecocash', 'EcoCash'),
		('card', 'Card'),
		('test', 'Test Mode'),
	]

	phone_number = models.CharField(max_length=15)
	origin_lat = models.FloatField()
	origin_lng = models.FloatField()
	destination_name = models.CharField(max_length=100)
	destination_lat = models.FloatField()
	destination_lng = models.FloatField()
	distance_km = models.FloatField()
	fare = models.FloatField()
	qr_code = models.CharField(max_length=100, unique=True)
	boarded = models.BooleanField(default=True)
	completed = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	# Payment fields
	payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='ecocash', null=True, blank=True)
	payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending', null=True, blank=True)
	payer_phone = models.CharField(max_length=15, null=True, blank=True)  # For EcoCash
	paynow_reference = models.CharField(max_length=100, null=True, blank=True, unique=True)  # Paynow transaction reference
	payment_timestamp = models.DateTimeField(null=True, blank=True)

	def __str__(self):
		return f"{self.phone_number} → {self.destination_name}"
