# Clean Database - Remove all old trips
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartbus_backend.settings')
django.setup()

from trips.models import Trip, GPSSimulationSession, GPSSimulationPoint

# Delete all trips
trip_count = Trip.objects.count()
Trip.objects.all().delete()

# Delete all GPS simulations
gps_session_count = GPSSimulationSession.objects.count()
GPSSimulationSession.objects.all().delete()
GPSSimulationPoint.objects.all().delete()

print(f"✅ Deleted {trip_count} trips")
print(f"✅ Deleted {gps_session_count} GPS simulation sessions")
print(f"✅ Database is now clean and ready for testing!")
