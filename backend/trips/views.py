import json
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Trip
from .paynow_utils import (
	create_ecocash_payment,
	create_card_payment,
	get_payment_status,
	get_test_phone_numbers,
	get_test_card_tokens,
	TEST_MODE,
)


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


@csrf_exempt
def initiate_payment(request):
	"""
	Initiate a payment via Paynow.
	
	POST data:
	{
		"trip_id": int,
		"payment_method": "ecocash" or "card",
		"phone_number": "+263771234567",
		"payer_phone": "+263779876543" (for ecocash),
		"card_token": "token-or-uuid" (for card),
		"amount": 10.50
	}
	"""
	if request.method != "POST":
		return JsonResponse({"error": "Method not allowed"}, status=405)
	
	try:
		data = json.loads(request.body)
	except json.JSONDecodeError:
		return JsonResponse({"error": "Invalid JSON"}, status=400)
	
	# Validate required fields
	required_fields = ["payment_method", "phone_number", "amount"]
	if not all(field in data for field in required_fields):
		return JsonResponse({"error": "Missing required fields"}, status=400)
	
	payment_method = data.get("payment_method", "").lower()
	phone_number = data.get("phone_number", "")
	amount = float(data.get("amount", 0))
	
	# Generate unique reference
	reference = f"BUS-{timezone.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
	
	try:
		# Route to appropriate payment handler
		if payment_method == "ecocash":
			payer_phone = data.get("payer_phone", phone_number)
			result = create_ecocash_payment(
				phone_number=phone_number,
				payer_phone=payer_phone,
				reference=reference,
				amount=amount,
				description=f"Bus fare - {data.get('destination', 'Trip')}"
			)
		elif payment_method == "card":
			card_token = data.get("card_token", "")
			result = create_card_payment(
				phone_number=phone_number,
				card_token=card_token,
				reference=reference,
				amount=amount,
				description=f"Bus fare - {data.get('destination', 'Trip')}"
			)
		else:
			return JsonResponse({"error": "Invalid payment method"}, status=400)
		
		# Create or update Trip with payment info
		trip = None
		if "trip_id" in data:
			try:
				trip = Trip.objects.get(id=data["trip_id"])
				trip.payment_method = payment_method
				trip.payment_status = "processing"
				trip.payer_phone = data.get("payer_phone", phone_number) if payment_method == "ecocash" else None
				trip.paynow_reference = reference
				trip.payment_timestamp = timezone.now()
				trip.save()
			except Trip.DoesNotExist:
				pass
		
		# Return response
		response = {
			"success": result.get("success", False),
			"reference": reference,
			"payment_method": payment_method,
			"amount": amount,
			"status": result.get("status", "pending"),
			"test_mode": TEST_MODE,
		}
		
		if "poll_url" in result:
			response["poll_url"] = result["poll_url"]
		if "error" in result:
			response["error"] = result["error"]
		
		status_code = 200 if result.get("success") else 400
		return JsonResponse(response, status=status_code)
	
	except Exception as e:
		return JsonResponse({
			"error": str(e),
			"reference": reference,
		}, status=500)


@csrf_exempt
def payment_status(request, reference):
	"""
	Check payment status for a given Paynow reference.
	"""
	if request.method != "GET":
		return JsonResponse({"error": "Method not allowed"}, status=405)
	
	try:
		trip = Trip.objects.get(paynow_reference=reference)
		
		# In production, you would poll Paynow here
		# For now, return the current status
		return JsonResponse({
			"reference": reference,
			"status": trip.payment_status,
			"method": trip.payment_method,
			"amount": trip.fare,
			"test_mode": TEST_MODE,
		})
	except Trip.DoesNotExist:
		return JsonResponse({
			"error": "Payment not found",
			"reference": reference,
		}, status=404)


@csrf_exempt
def get_test_data(request):
	"""
	Return test phone numbers and card tokens for development.
	This endpoint should be disabled in production.
	"""
	if not TEST_MODE:
		return JsonResponse({"error": "Test mode is disabled"}, status=403)
	
	return JsonResponse({
		"test_mode": True,
		"ecocash_test_numbers": get_test_phone_numbers(),
		"card_test_tokens": get_test_card_tokens(),
		"merchant_email": "n02218334j@students.nust.ac.zw",
		"info": {
			"success": "Payment will complete within 5 seconds",
			"delayed": "Payment will complete within 30 seconds",
			"failed": "Payment will fail after 30 seconds (user cancelled)",
			"insufficient_balance": "Payment will fail immediately",
		}
	})

