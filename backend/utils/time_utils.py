from datetime import datetime, timezone, timedelta

# Indian Standard Time is UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Get current time in IST"""
    return datetime.now(IST)

def utc_to_ist(utc_datetime):
    """Convert UTC datetime to IST"""
    if isinstance(utc_datetime, str):
        utc_datetime = datetime.fromisoformat(utc_datetime.replace('Z', '+00:00'))
    if utc_datetime.tzinfo is None:
        utc_datetime = utc_datetime.replace(tzinfo=timezone.utc)
    return utc_datetime.astimezone(IST)

def ist_to_utc(ist_datetime):
    """Convert IST datetime to UTC"""
    if isinstance(ist_datetime, str):
        ist_datetime = datetime.fromisoformat(ist_datetime)
    if ist_datetime.tzinfo is None:
        ist_datetime = ist_datetime.replace(tzinfo=IST)
    return ist_datetime.astimezone(timezone.utc)

def validate_timestamp(timestamp_str, max_hours_difference=2):
    """
    Validate that timestamp is not in future and within allowed time window
    Returns (is_valid, error_message, parsed_datetime)
    """
    try:
        # Parse the timestamp
        timestamp = datetime.fromisoformat(timestamp_str)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=IST)
        
        # Get current IST time
        now_ist = get_ist_now()
        
        # Check if timestamp is in future
        if timestamp > now_ist:
            return False, "Timestamp cannot be in the future", None
        
        # Check if timestamp is within allowed window
        time_difference = now_ist - timestamp
        max_difference = timedelta(hours=max_hours_difference)
        
        if time_difference > max_difference:
            return False, f"Timestamp must be within {max_hours_difference} hours of current time", None
        
        return True, None, timestamp
    except Exception as e:
        return False, f"Invalid timestamp format: {str(e)}", None

def handle_midnight_boundary(selected_datetime):
    """
    Handle midnight boundary issues
    Returns adjusted datetime if needed
    """
    # If time is between 11 PM and 1 AM, extra validation
    hour = selected_datetime.hour
    
    if hour == 23 or hour == 0:
        # Near midnight, ensure date is correct
        now_ist = get_ist_now()
        
        # If selected time is 11 PM but current time is past midnight
        if hour == 23 and now_ist.hour < 2:
            # User probably means yesterday
            selected_datetime = selected_datetime - timedelta(days=1)
        
        # If selected time is 12-1 AM but current time is before midnight
        if hour == 0 and now_ist.hour == 23:
            # User probably means tomorrow (technically today after midnight)
            selected_datetime = selected_datetime + timedelta(days=1)
    
    return selected_datetime
