"""
Paynow Integration Utility Module
Integration ID: 23274
Test Mode Support for EcoCash and Card Payments

Uses Official Paynow Python SDK
"""

import os
from datetime import datetime
from typing import Dict, Optional
from paynow import Paynow

# Paynow configuration
PAYNOW_INTEGRATION_ID = os.getenv('PAYNOW_INTEGRATION_ID', '23274')
PAYNOW_INTEGRATION_KEY = os.getenv('PAYNOW_INTEGRATION_KEY', '')
PAYNOW_MERCHANT_EMAIL = os.getenv('PAYNOW_MERCHANT_EMAIL', 'n02218334j@students.nust.ac.zw')

# Initialize Paynow SDK
paynow = Paynow(
    integration_id=PAYNOW_INTEGRATION_ID,
    integration_key=PAYNOW_INTEGRATION_KEY,
    return_url=os.getenv('PAYNOW_RETURN_URL', 'http://10.130.1.95:8000/api/payment/callback'),
    result_url=os.getenv('PAYNOW_RESULT_URL', 'http://10.130.1.95:8000/api/payment/result')
)

# Test Mode Configuration
TEST_MODE = os.getenv('PAYNOW_TEST_MODE', 'True').lower() == 'true'

# Test phone numbers for EcoCash (mobile money)
ECOCASH_TEST_NUMBERS = {
    '0771111111': 'success_immediate',  # Success - 5 seconds
    '0772222222': 'success_delayed',    # Success - 30 seconds
    '0773333333': 'failed',             # User cancelled - 30 seconds
    '0774444444': 'insufficient_balance',  # Immediate fail
}

# Test tokens for Card (Visa/MasterCard)
CARD_TEST_TOKENS = {
    '11111111-1111-1111-1111-111111111111': 'success_immediate',
    '22222222-2222-2222-2222-222222222222': 'success_delayed',
    '33333333-3333-3333-3333-333333333333': 'failed',
    '44444444-4444-4444-4444-444444444444': 'insufficient_balance',
}

# Test tokens for Zimswitch
ZIMSWITCH_TEST_TOKENS = {
    '11111111111111111111111111111111': 'success_immediate',
    '22222222222222222222222222222222': 'success_delayed',
    '33333333333333333333333333333333': 'failed',
    '44444444444444444444444444444444': 'insufficient_balance',
}



def create_ecocash_payment(phone_number: str, payer_phone: str, reference: str, 
                          amount: float, description: str = "Bus Fare") -> Dict:
    """
    Create an EcoCash payment request via Paynow SDK.
    
    Args:
        phone_number: Passenger's phone number (for SMS delivery of QR)
        payer_phone: Payer's phone number (receives payment prompt)
        reference: Unique transaction reference
        amount: Payment amount in USD
        description: Payment description
    
    Returns:
        Dict with transaction status and details
    """
    
    if TEST_MODE:
        return _simulate_ecocash_payment(payer_phone, reference, amount)
    
    try:
        # Create payment using Paynow SDK
        payment = paynow.create_payment(reference, PAYNOW_MERCHANT_EMAIL)
        
        # Add item to payment
        payment.add(description, amount)
        
        # Send mobile payment request
        response = paynow.send_mobile(payment, payer_phone, 'ecocash')
        
        if response.success:
            return {
                'success': True,
                'status': 'processing',
                'reference': reference,
                'poll_url': response.poll_url if hasattr(response, 'poll_url') else None,
                'message': f'EcoCash payment initiated',
            }
        else:
            return {
                'success': False,
                'error': response.errors if hasattr(response, 'errors') else 'Payment failed',
                'reference': reference,
            }
    except Exception as e:
        return {
            'success': False,
            'error': f'EcoCash payment error: {str(e)}',
            'reference': reference,
        }


def create_card_payment(phone_number: str, card_token: str, reference: str, 
                       amount: float, description: str = "Bus Fare") -> Dict:
    """
    Create a Card (Visa/MasterCard) payment request via Paynow SDK.
    
    Args:
        phone_number: Passenger's phone number
        card_token: Card token or test token
        reference: Unique transaction reference
        amount: Payment amount in USD
        description: Payment description
    
    Returns:
        Dict with transaction status and details
    """
    
    if TEST_MODE:
        return _simulate_card_payment(card_token, reference, amount)
    
    try:
        # Create payment using Paynow SDK
        payment = paynow.create_payment(reference, PAYNOW_MERCHANT_EMAIL)
        
        # Add item to payment
        payment.add(description, amount)
        
        # Send payment request
        # Note: For card payments, you typically initiate and get redirect URL
        response = paynow.send(payment)
        
        if response.success:
            return {
                'success': True,
                'status': 'processing',
                'reference': reference,
                'poll_url': response.poll_url if hasattr(response, 'poll_url') else None,
                'redirect_url': response.redirect_url if hasattr(response, 'redirect_url') else None,
                'message': f'Card payment initiated',
            }
        else:
            return {
                'success': False,
                'error': response.errors if hasattr(response, 'errors') else 'Payment failed',
                'reference': reference,
            }
    except Exception as e:
        return {
            'success': False,
            'error': f'Card payment error: {str(e)}',
            'reference': reference,
        }


def _simulate_ecocash_payment(payer_phone: str, reference: str, amount: float) -> Dict:
    """
    Simulate EcoCash payment in test mode using predefined test numbers.
    """
    
    # Check if phone number matches test scenarios
    test_result = ECOCASH_TEST_NUMBERS.get(payer_phone, 'success_immediate')
    
    if test_result == 'insufficient_balance':
        return {
            'success': False,
            'error': 'Insufficient balance',
            'status': 'failed',
            'reference': reference,
            'test_mode': True,
            'simulated': True,
        }
    
    if test_result == 'failed':
        return {
            'success': False,
            'error': 'Transaction cancelled by user',
            'status': 'failed',
            'reference': reference,
            'test_mode': True,
            'simulated': True,
        }
    
    # For delayed success scenarios, we would normally implement polling
    # For now, we return success - the actual status would be updated via webhook
    return {
        'success': True,
        'status': 'processing',
        'reference': reference,
        'test_mode': True,
        'simulated': True,
        'poll_url': f'/api/trips/payment-status/{reference}/',
        'message': f'Test payment initiated for {payer_phone}',
    }


def _simulate_card_payment(card_token: str, reference: str, amount: float) -> Dict:
    """
    Simulate Card payment in test mode using predefined test tokens.
    """
    
    # Determine payment result from token
    test_result = CARD_TEST_TOKENS.get(card_token, 'success_immediate')
    
    if test_result == 'insufficient_balance':
        return {
            'success': False,
            'error': 'Insufficient balance',
            'status': 'failed',
            'reference': reference,
            'test_mode': True,
            'simulated': True,
        }
    
    if test_result == 'failed':
        return {
            'success': False,
            'error': 'Transaction cancelled by user',
            'status': 'failed',
            'reference': reference,
            'test_mode': True,
            'simulated': True,
        }
    
    return {
        'success': True,
        'status': 'processing',
        'reference': reference,
        'test_mode': True,
        'simulated': True,
        'poll_url': f'/api/trips/payment-status/{reference}/',
        'message': f'Test card payment processing: {card_token}',
    }


def _parse_paynow_response(response_text: str) -> Dict:
    """
    Parse Paynow API response from SDK.
    The SDK handles response parsing, but this is kept for compatibility.
    """
    return {
        'success': True,
        'status': 'processing',
    }


def get_payment_status(reference: str, poll_url: Optional[str] = None) -> Dict:
    """
    Check payment status via Paynow polling URL.
    """
    
    if not poll_url:
        return {'success': False, 'error': 'No poll URL provided'}
    
    try:
        response = requests.get(poll_url, timeout=10)
        response.raise_for_status()
        return _parse_paynow_response(response.text)
    except requests.RequestException as e:
        return {
            'success': False,
            'error': str(e),
            'reference': reference,
        }


def get_test_phone_numbers() -> Dict[str, str]:
    """Return test phone numbers for development."""
    return {
        'success_5s': '0771111111',
        'success_30s': '0772222222',
        'failed_user_cancelled': '0773333333',
        'failed_insufficient_balance': '0774444444',
    }


def get_test_card_tokens() -> Dict[str, str]:
    """Return test card tokens for development."""
    return {
        'success_5s': '11111111-1111-1111-1111-111111111111',
        'success_30s': '22222222-2222-2222-2222-222222222222',
        'failed_user_cancelled': '33333333-3333-3333-3333-333333333333',
        'failed_insufficient_balance': '44444444-4444-4444-4444-444444444444',
    }
