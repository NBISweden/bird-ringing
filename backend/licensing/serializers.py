import json
import datetime
import decimal
from django.db import models

def json_serialize_defaults(value):
    if isinstance(value, datetime.date):
        return value.isoformat()
    elif isinstance(value, datetime.datetime):
        return value.isoformat()
    elif isinstance(value, decimal.Decimal):
        return float(value)
    elif isinstance(value, set):
        return list(value)
    elif isinstance(value, models.Model):
        return str(value)
    else:
        raise TypeError(f"No default serializer for {type(value).__name__}")


def json_serialize(data):
    return json.dumps(data, indent=4, sort_keys=True, ensure_ascii=False, default=json_serialize_defaults)