from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    slope = Column(Float, nullable=False)  # slope in degrees
    elevation = Column(Float, nullable=False)  # in meters MSL
    river_name = Column(String(100), nullable=False)
    danger_river_level = Column(Float, nullable=False)  # Danger mark in meters
    scenario = Column(String(50), default="NORMAL")  # NORMAL, BUILDING_STORM, FLASH_FLOOD_IMMINENT
    scenario_step = Column(Integer, default=0)

    sensor_readings = relationship("SensorReading", back_populates="location", cascade="all, delete-orphan", order_by="desc(SensorReading.timestamp)")
    risk_predictions = relationship("RiskPrediction", back_populates="location", cascade="all, delete-orphan", order_by="desc(RiskPrediction.timestamp)")
    infrastructure = relationship("Infrastructure", back_populates="location", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="location", cascade="all, delete-orphan", order_by="desc(Alert.created_at)")
    sms_dispatches = relationship("SMSDispatch", back_populates="location", cascade="all, delete-orphan", order_by="desc(SMSDispatch.created_at)")
    historical_events = relationship("HistoricalEvent", back_populates="location", cascade="all, delete-orphan", order_by="desc(HistoricalEvent.event_date)")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    rainfall_1h = Column(Float, nullable=False)
    rainfall_3h = Column(Float, nullable=False)
    rainfall_6h = Column(Float, nullable=False)
    rainfall_24h = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    river_level = Column(Float, nullable=False)
    river_level_change_rate = Column(Float, nullable=False)  # m/h
    soil_moisture = Column(Float, nullable=False)  # %
    distance_from_river = Column(Float, default=50.0)  # meters
    forecast_rainfall_next_3h = Column(Float, nullable=False)  # mm

    location = relationship("Location", back_populates="sensor_readings")


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    risk_score = Column(Float, nullable=False)  # 0.0 - 100.0
    risk_level = Column(String(20), nullable=False)  # NORMAL, WATCH, WARNING, CRITICAL
    warning_window_minutes = Column(Integer, nullable=False)
    contributions_json = Column(Text, nullable=False)  # JSON formatted dictionary

    location = relationship("Location", back_populates="risk_predictions")


class Infrastructure(Base):
    __tablename__ = "infrastructure"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False)  # village, road, bridge, school, hospital
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    population_estimate = Column(Integer, nullable=True)
    distance_km = Column(Float, nullable=True)

    location = relationship("Location", back_populates="infrastructure")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_level = Column(String(20), nullable=False)  # WATCH, WARNING, CRITICAL, NORMAL
    message = Column(Text, nullable=False)
    action_recommended = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)

    location = relationship("Location", back_populates="alerts")


class SMSDispatch(Base):
    __tablename__ = "sms_dispatches"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_group = Column(String(50), nullable=False)  # RESIDENTS, PRADHANS, RESCUE_TEAMS, DISTRICT_ADMIN, ALL
    phone_numbers_count = Column(Integer, nullable=False, default=1)
    sample_phone = Column(String(20), nullable=True)
    language = Column(String(10), nullable=False, default="EN")  # EN, HI, BILINGUAL
    risk_level = Column(String(20), nullable=False)
    message_text = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="DELIVERED")  # DELIVERED, SENT, FAILED
    delivery_rate = Column(Float, default=99.2)  # percentage
    carrier_reference = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    location = relationship("Location", back_populates="sms_dispatches")


class HistoricalEvent(Base):
    __tablename__ = "historical_events"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    event_date = Column(String(50), nullable=False)  # e.g. "2013-06-16" or "16-17 June 2013"
    event_type = Column(String(50), nullable=False)  # flash_flood, landslide, cloudburst
    trigger_rainfall_mm = Column(Float, nullable=True)  # in mm
    river_level_at_peak = Column(Float, nullable=True)  # in meters
    casualties = Column(Integer, nullable=True)  # number of casualties/missing
    description = Column(Text, nullable=False)
    source_citation = Column(Text, nullable=False)  # Government/academic source citation

    location = relationship("Location", back_populates="historical_events")

