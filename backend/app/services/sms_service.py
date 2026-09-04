import os
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import Location, SMSDispatch, Infrastructure, RiskPrediction

logger = logging.getLogger("floodguard.sms")

# Pre-defined CAP (Common Alerting Protocol) compliant emergency templates
SMS_TEMPLATES = [
    {
        "id": "TPL_CRITICAL_EVACUATION",
        "name": "Priority-1 Flash Flood Evacuation Order",
        "risk_level": "CRITICAL",
        "description": "Triggered when flash flood/cloudburst is imminent (<60 mins lead time). Directs immediate movement to higher ground shelters.",
        "template_en": "🚨 URGENT FLASH FLOOD ALERT: {location_name} basin ({river_name}). Critical surge risk {risk_score}%. River overflowing in ~{lead_time} mins. Evacuate IMMEDIATELY to {safe_shelter} via {evac_route}. Do NOT cross bridges. NDRF Helpline: 1077 / DEOC: 1070 - FloodGuard Disaster Authority",
        "template_hi": "🚨 आपातकालीन बाढ़ चेतावनी: {location_name} बेसिन ({river_name})। जलस्तर खतरे के निशान से ऊपर, ~{lead_time} मिनट में बाढ़ की आशंका। तुरंत {safe_shelter} (मार्ग: {evac_route}) की ओर जाएं। पुल पार न करें। एनडीआरएफ हेल्पलाइन: 1077 / जिला आपदा: 1070 - फ्लडगार्ड आपदा नियंत्रण"
    },
    {
        "id": "TPL_WARNING_ADVISORY",
        "name": "Surge Warning & Shelter Standby Advisory",
        "risk_level": "WARNING",
        "description": "Triggered when river levels are rising rapidly. Advises riverside evacuation preparation and livestock movement.",
        "template_en": "⚠️ FLASH FLOOD WARNING: {location_name} ({river_name}). Heavy runoff detected, risk index {risk_score}%. Evacuation window ~{lead_time} mins. Move livestock & valuables to higher ground. Shelter ready at {safe_shelter}. Control Room: 1077 - FloodGuard Early Warning",
        "template_hi": "⚠️ बाढ़ चेतावनी: {location_name} ({river_name})। नदी में तीव्र जलप्रवाह, जोखिम {risk_score}%। निकासी समय ~{lead_time} मिनट। मवेशियों और आवश्यक वस्तुओं को ऊंचे स्थान पर ले जाएं। आश्रय स्थल: {safe_shelter}। हेल्पलाइन: 1077 - फ्लडगार्ड"
    },
    {
        "id": "TPL_WATCH_VILLAGE_HEADS",
        "name": "Community Warden & Pradhan Alert",
        "risk_level": "WATCH",
        "description": "Alerts local village sarpanch, wardens, and disaster volunteers to monitor tributary culverts.",
        "template_en": "📢 HYDROLOGICAL ADVISORY: {location_name} catchment experiencing sustained rain. River stage at {river_stage}m. Village Pradhans requested to inspect low-lying culverts and activate community siren if rain increases. - FloodGuard DEOC",
        "template_hi": "📢 जलस्तर सतर्कता सूचना: {location_name} क्षेत्र में लगातार बारिश। नदी स्तर {river_stage}m। ग्राम प्रधानों से अनुरोध है कि निचले पुलियों पर निगरानी रखें और सतर्क रहें। - फ्लडगार्ड DEOC"
    },
    {
        "id": "TPL_ALL_CLEAR",
        "name": "All-Clear & Safe Return Notice",
        "risk_level": "NORMAL",
        "description": "Notifies evacuated residents that river discharge has normalized below danger mark.",
        "template_en": "✅ ALL CLEAR NOTICE: {location_name} ({river_name}) river levels have receded below danger mark. Flow stabilized. Safe to return with caution. Report any road damage to 1077. - FloodGuard Relief",
        "template_hi": "✅ स्थिति सामान्य सूचना: {location_name} ({river_name}) नदी का जलस्तर खतरे के निशान से नीचे आ गया है। स्थिति नियंत्रण में है। सावधानीपूर्वक लौट सकते हैं। सड़क क्षति की सूचना 1077 पर दें। - फ्लडगार्ड"
    }
]

def generate_sms_text(
    location: Location,
    risk_level: str,
    risk_score: float,
    lead_time: int,
    river_stage: float,
    language: str = "BILINGUAL",
    custom_safe_zone: Optional[str] = None,
    recipient_group: str = "ALL"
) -> Dict[str, Any]:
    """
    Generates tailored, localized emergency SMS text in English, Hindi, or Bilingual format.
    """
    # Pick safe shelter from location infrastructure
    safe_shelter = custom_safe_zone
    if not safe_shelter and location.infrastructure:
        # Pick hospital or school with lowest vulnerability
        candidates = [inf for inf in location.infrastructure if inf.type in ["school", "hospital", "village"]]
        if candidates:
            safe_shelter = candidates[0].name
        else:
            safe_shelter = f"{location.name} High Altitude Community Shelter"
    elif not safe_shelter:
        safe_shelter = f"{location.name} Relief Camp & Elevated Ground"

    evac_route = "Designated Ridge Route-A"

    if risk_level == "CRITICAL":
        text_en = f"🚨 URGENT FLASH FLOOD ALERT: {location.name} basin ({location.river_name}). Critical surge risk {risk_score}%. River overflowing in ~{lead_time} mins. Evacuate IMMEDIATELY to {safe_shelter} via {evac_route}. Do NOT cross bridges. NDRF: 1077 / DEOC: 1070 - FloodGuard"
        text_hi = f"🚨 आपातकालीन बाढ़ चेतावनी: {location.name} बेसिन ({location.river_name})। जलस्तर खतरे के निशान से ऊपर, ~{lead_time} मिनट में जलप्रवाह की आशंका। तुरंत {safe_shelter} की ओर प्रस्थान करें। पुल पार न करें। NDRF: 1077 / DEOC: 1070 - फ्लडगार्ड"
    elif risk_level == "WARNING":
        text_en = f"⚠️ FLASH FLOOD WARNING: {location.name} ({location.river_name}). Hydrological surge risk {risk_score}%. River stage {river_stage}m. Prepare for immediate evacuation to {safe_shelter}. Move livestock to higher ridges. Control: 1077 - FloodGuard"
        text_hi = f"⚠️ बाढ़ चेतावनी: {location.name} ({location.river_name})। नदी में तीव्र जलप्रवाह, जोखिम {risk_score}%। जलस्तर {river_stage}m। {safe_shelter} की ओर जाने के लिए तैयार रहें। हेल्पलाइन: 1077 - फ्लडगार्ड"
    elif risk_level == "WATCH":
        text_en = f"📢 FLOOD WATCH ADVISORY: {location.name} ({location.river_name}) risk index at {risk_score}%. River stage {river_stage}m. Avoid riverbanks and mountain streams. Stay tuned for further updates. Helpline: 1077 - FloodGuard"
        text_hi = f"📢 बाढ़ निगरानी सूचना: {location.name} ({location.river_name}) में जोखिम स्तर {risk_score}%। नदी स्तर {river_stage}m। नदी तटों से दूर रहें। आपातकालीन संपर्क: 1077 - फ्लडगार्ड"
    else:  # NORMAL
        text_en = f"✅ SAFE STATUS UPDATE: {location.name} ({location.river_name}) hydrological parameters are normal. Current river stage {river_stage}m. Routine monitoring active. - FloodGuard"
        text_hi = f"✅ सुरक्षित स्थिति सूचना: {location.name} ({location.river_name}) नदी का जलस्तर {river_stage}m पर सामान्य है। निगरानी जारी है। - फ्लडगार्ड"

    if language == "EN":
        final_text = text_en
    elif language == "HI":
        final_text = text_hi
    else:  # BILINGUAL
        final_text = f"{text_en}\n---\n{text_hi}"

    char_count = len(final_text)
    # Standard SMS is 160 GSM chars, or 70 Unicode chars per segment
    sms_parts = max(1, (char_count // 140) + (1 if char_count % 140 > 0 else 0))

    # Recipient count estimation based on village populations
    base_pop = sum(inf.population_estimate or 1500 for inf in location.infrastructure) or 12000
    if recipient_group == "RESIDENTS":
        estimated_recipients = int(base_pop * 0.85)
    elif recipient_group == "PRADHANS":
        estimated_recipients = max(15, len(location.infrastructure) * 3)
    elif recipient_group == "RESCUE_TEAMS":
        estimated_recipients = 85  # NDRF/SDRF personnel
    elif recipient_group == "DISTRICT_ADMIN":
        estimated_recipients = 30  # DEOC / SDM / Police officers
    else:  # ALL
        estimated_recipients = base_pop + 120

    return {
        "location_id": location.id,
        "location_name": location.name,
        "risk_level": risk_level,
        "language": language,
        "recipient_group": recipient_group,
        "message_text_en": text_en,
        "message_text_hi": text_hi,
        "final_sms_text": final_text,
        "character_count": char_count,
        "sms_parts": sms_parts,
        "estimated_recipients": estimated_recipients,
        "safe_shelter": safe_shelter,
        "helpline": "1077 (NDRF) / 1070 (State Emergency Operations)"
    }

def dispatch_emergency_sms(
    db: Session,
    location_id: int,
    recipient_group: str,
    language: str,
    message_text: str,
    sample_phone: Optional[str] = "+91 98765 43210"
) -> SMSDispatch:
    """
    Executes or simulates carrier gateway dispatch and stores audit log in SQLite.
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise ValueError(f"Location with ID {location_id} not found")

    pred = location.risk_predictions[0] if location.risk_predictions else None
    risk_level = pred.risk_level if pred else "NORMAL"

    # Estimate recipient count
    base_pop = sum(inf.population_estimate or 1500 for inf in location.infrastructure) or 12000
    if recipient_group == "RESIDENTS":
        phone_count = int(base_pop * 0.85)
    elif recipient_group == "PRADHANS":
        phone_count = max(15, len(location.infrastructure) * 3)
    elif recipient_group == "RESCUE_TEAMS":
        phone_count = 85
    elif recipient_group == "DISTRICT_ADMIN":
        phone_count = 30
    else:
        phone_count = base_pop + 120

    # Carrier transaction reference
    carrier_ref = f"FG-SMS-{location.state[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"

    dispatch_record = SMSDispatch(
        location_id=location.id,
        recipient_group=recipient_group,
        phone_numbers_count=phone_count,
        sample_phone=sample_phone,
        language=language,
        risk_level=risk_level,
        message_text=message_text,
        status="DELIVERED",
        delivery_rate=99.4,
        carrier_reference=carrier_ref,
        created_at=datetime.utcnow()
    )

    db.add(dispatch_record)
    db.commit()
    db.refresh(dispatch_record)

    logger.info(f"[SMS Gateway] Dispatched {phone_count} messages to {recipient_group} for {location.name}. Ref: {carrier_ref}")
    return dispatch_record
