"""
GSTIN (GST Identification Number) validator for India.
Format: 2-digit state code + 10-char PAN + 1 entity number + Z + 1 checksum char
Total: 15 characters
"""
import re
from typing import Optional

GSTIN_PATTERN = re.compile(
    r"^[0-3][0-9]"           # state code 01-37
    r"[A-Z]{5}[0-9]{4}[A-Z]" # PAN (10 chars)
    r"[1-9A-Z]"               # entity number
    r"Z"                      # always Z
    r"[0-9A-Z]$"              # checksum
)

STATE_CODES = {
    "01": "Jammu & Kashmir",   "02": "Himachal Pradesh",
    "03": "Punjab",            "04": "Chandigarh",
    "05": "Uttarakhand",       "06": "Haryana",
    "07": "Delhi",             "08": "Rajasthan",
    "09": "Uttar Pradesh",     "10": "Bihar",
    "11": "Sikkim",            "12": "Arunachal Pradesh",
    "13": "Nagaland",          "14": "Manipur",
    "15": "Mizoram",           "16": "Tripura",
    "17": "Meghalaya",         "18": "Assam",
    "19": "West Bengal",       "20": "Jharkhand",
    "21": "Odisha",            "22": "Chhattisgarh",
    "23": "Madhya Pradesh",    "24": "Gujarat",
    "25": "Daman & Diu",       "26": "Dadra & Nagar Haveli",
    "27": "Maharashtra",       "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",         "30": "Goa",
    "31": "Lakshadweep",       "32": "Kerala",
    "33": "Tamil Nadu",        "34": "Puducherry",
    "35": "Andaman & Nicobar", "36": "Telangana",
    "37": "Andhra Pradesh",    "38": "Ladakh",
    "97": "Other Territory",   "99": "Centre Jurisdiction",
}


def validate_gstin(gstin: str) -> dict:
    """Returns {"valid": bool, "state": str|None, "error": str|None}"""
    if not gstin:
        return {"valid": False, "state": None, "error": "GSTIN is empty"}

    gstin = gstin.strip().upper()

    if len(gstin) != 15:
        return {"valid": False, "state": None, "error": f"GSTIN must be 15 characters (got {len(gstin)})"}

    if not GSTIN_PATTERN.match(gstin):
        return {"valid": False, "state": None, "error": "GSTIN format is invalid"}

    state_code = gstin[:2]
    state = STATE_CODES.get(state_code)
    if not state:
        return {"valid": False, "state": None, "error": f"Unknown state code: {state_code}"}

    return {
        "valid": True,
        "state": state,
        "state_code": state_code,
        "pan": gstin[2:12],
        "entity": gstin[12],
        "error": None,
    }


def get_pan_from_gstin(gstin: str) -> Optional[str]:
    result = validate_gstin(gstin)
    return result.get("pan") if result["valid"] else None
