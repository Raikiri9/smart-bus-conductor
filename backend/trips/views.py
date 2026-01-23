import json
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Trip


@csrf_exempt
def create_trip(request):
	if request.method == "POST":
		data = json.loads(request.body)

		qr_id = str(uuid.uuid4())

		trip = Trip.objects.create(
			phone_number=data["phone_number"],
			origin_lat=data["origin_lat"],
			origin_lng=data["origin_lng"],
			destination_name=data["destination_name"],
			destination_lat=data["destination_lat"],
			destination_lng=data["destination_lng"],
			distance_km=data["distance_km"],
			fare=data["fare"],
			qr_code=qr_id
		)

		return JsonResponse({
			"status": "success",
			"qr_code": qr_id,
			"trip_id": trip.id
		})


@csrf_exempt
def validate_qr(request):
	data = json.loads(request.body)
	qr_code = data["qr_code"]

	try:
		trip = Trip.objects.get(qr_code=qr_code, boarded=True)
		trip.completed = True
		trip.boarded = False
		trip.save()

		return JsonResponse({"status": "valid"})
	except Trip.DoesNotExist:
		return JsonResponse({"status": "invalid"})


def active_trips(request):
	trips = Trip.objects.filter(boarded=True, completed=False)

	data = []
	for trip in trips:
		data.append({
			"id": trip.id,
			"destination_lat": trip.destination_lat,
			"destination_lng": trip.destination_lng,
			"destination_name": trip.destination_name,
			"distance_km": trip.distance_km,
		})

	return JsonResponse(data, safe=False)
