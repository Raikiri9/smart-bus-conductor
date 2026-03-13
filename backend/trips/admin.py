from django.contrib import admin
from .models import PassengerTrip, Trip


@admin.register(PassengerTrip)
class PassengerTripAdmin(admin.ModelAdmin):
	list_display = ['ticket_id', 'origin', 'destination', 'status', 'fare', 'created_at']
	list_filter = ['status', 'created_at']
	search_fields = ['ticket_id', 'origin', 'destination']
	readonly_fields = ['created_at', 'updated_at']


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
	list_display = ['get_origin', 'destination_name', 'fare', 'distance_km', 'boarded', 'completed', 'created_at']
	list_filter = ['boarded', 'completed', 'created_at']
	search_fields = ['phone_number', 'destination_name', 'qr_code']
	readonly_fields = ['created_at']
	
	def get_origin(self, obj):
		"""Display phone number under 'Origin' column header"""
		return obj.phone_number
	get_origin.short_description = 'Origin'
