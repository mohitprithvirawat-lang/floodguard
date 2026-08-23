import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger("floodguard.ml")

FEATURE_NAMES = [
    "rainfall_1h",
    "rainfall_3h",
    "rainfall_6h",
    "rainfall_24h",
    "temperature",
    "humidity",
    "river_level",
    "river_level_change_rate",
    "soil_moisture",
    "slope",
    "elevation",
    "distance_from_river",
    "forecast_rainfall_next_3h"
]

FEATURE_LABELS = {
    "rainfall_1h": "1-Hour Rainfall (mm)",
    "rainfall_3h": "3-Hour Rainfall (mm)",
    "rainfall_6h": "6-Hour Rainfall (mm)",
    "rainfall_24h": "24-Hour Rainfall (mm)",
    "temperature": "Ambient Temp (°C)",
    "humidity": "Relative Humidity (%)",
    "river_level": "River Stage (m)",
    "river_level_change_rate": "River Surge Rate (m/h)",
    "soil_moisture": "Soil Saturation (%)",
    "slope": "Terrain Slope Angle (°)",
    "elevation": "Basin Elevation (m)",
    "distance_from_river": "Proximity to River (m)",
    "forecast_rainfall_next_3h": "Forecast Rain (Next 3h)"
}

class FloodRiskModel:
    def __init__(self):
        self.clf: RandomForestClassifier = None
        self.reg_score: RandomForestRegressor = None
        self.reg_window: RandomForestRegressor = None
        self.is_trained: bool = False
        self.feature_importances_: Dict[str, float] = {}

    def generate_synthetic_training_data(self, n_samples: int = 3000) -> pd.DataFrame:
        """
        Generates realistic hydrological synthetic training data mimicking
        Himalayan mountain watersheds (cloudbursts, steep runoff, saturated soil).
        """
        np.random.seed(42)

        # Baseline terrain features
        slope = np.random.uniform(5.0, 50.0, n_samples)  # degrees
        elevation = np.random.uniform(300.0, 3800.0, n_samples)  # meters
        distance_from_river = np.random.uniform(10.0, 300.0, n_samples)  # meters

        # Weather & hydrological variables
        rainfall_1h = np.random.exponential(scale=12.0, size=n_samples)
        rainfall_3h = rainfall_1h * np.random.uniform(1.8, 2.9, n_samples) + np.random.uniform(0, 10, n_samples)
        rainfall_6h = rainfall_3h * np.random.uniform(1.3, 2.0, n_samples) + np.random.uniform(0, 15, n_samples)
        rainfall_24h = rainfall_6h * np.random.uniform(1.4, 2.5, n_samples) + np.random.uniform(0, 25, n_samples)

        temperature = np.random.uniform(12.0, 34.0, n_samples)
        humidity = np.clip(rainfall_1h * 1.5 + np.random.uniform(40.0, 75.0, n_samples), 30.0, 100.0)

        soil_moisture = np.clip(
            (rainfall_24h / 150.0) * 60.0 + np.random.uniform(20.0, 50.0, n_samples),
            10.0,
            100.0
        )

        river_level_change_rate = np.random.normal(
            loc=(rainfall_3h / 40.0) * 0.8 + (slope / 50.0) * 0.4,
            scale=0.3,
            size=n_samples
        )
        river_level_change_rate = np.clip(river_level_change_rate, -0.5, 4.5)

        base_river_level = np.random.uniform(2.0, 8.0, n_samples)
        river_level = base_river_level + np.maximum(0, river_level_change_rate * 1.8)

        forecast_rainfall_next_3h = np.clip(
            rainfall_1h * np.random.uniform(0.6, 2.2, n_samples) + np.random.normal(5.0, 10.0, n_samples),
            0.0,
            140.0
        )

        # Physics-guided Flash Flood Risk Index computation (0 - 100)
        r1h_norm = np.clip(rainfall_1h / 60.0, 0, 1.5)
        r3h_norm = np.clip(rainfall_3h / 100.0, 0, 1.5)
        soil_norm = np.clip(soil_moisture / 100.0, 0, 1.0)
        rate_norm = np.clip(river_level_change_rate / 2.5, 0, 1.5)
        slope_norm = np.clip(slope / 45.0, 0, 1.2)
        forecast_norm = np.clip(forecast_rainfall_next_3h / 80.0, 0, 1.5)

        # Non-linear flash flood risk formulation
        raw_score = (
            0.26 * r3h_norm +
            0.22 * rate_norm +
            0.18 * soil_norm +
            0.14 * forecast_norm +
            0.10 * slope_norm +
            0.10 * r1h_norm
        ) * 100.0

        # Multiplicative compound effect when both soil is saturated AND rainfall is intense
        compound_multiplier = np.where((soil_moisture > 75.0) & (rainfall_3h > 45.0), 1.25, 1.0)
        risk_score = np.clip(raw_score * compound_multiplier + np.random.normal(0, 3.0, n_samples), 0.0, 100.0)

        # Risk categories
        # NORMAL: 0 - 35
        # WATCH: 35 - 60
        # WARNING: 60 - 80
        # CRITICAL: 80 - 100
        risk_level = []
        warning_window = []
        for s in risk_score:
            if s < 35.0:
                risk_level.append("NORMAL")
                warning_window.append(np.random.randint(360, 720))
            elif s < 60.0:
                risk_level.append("WATCH")
                warning_window.append(np.random.randint(180, 360))
            elif s < 80.0:
                risk_level.append("WARNING")
                warning_window.append(np.random.randint(60, 180))
            else:
                risk_level.append("CRITICAL")
                warning_window.append(np.random.randint(15, 60))

        df = pd.DataFrame({
            "rainfall_1h": rainfall_1h,
            "rainfall_3h": rainfall_3h,
            "rainfall_6h": rainfall_6h,
            "rainfall_24h": rainfall_24h,
            "temperature": temperature,
            "humidity": humidity,
            "river_level": river_level,
            "river_level_change_rate": river_level_change_rate,
            "soil_moisture": soil_moisture,
            "slope": slope,
            "elevation": elevation,
            "distance_from_river": distance_from_river,
            "forecast_rainfall_next_3h": forecast_rainfall_next_3h,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "warning_window_minutes": warning_window
        })

        return df

    def train(self):
        """Train RandomForest models for risk score, level, and warning window."""
        logger.info("Generating synthetic hydrological dataset for model training...")
        df = self.generate_synthetic_training_data(n_samples=4000)

        X = df[FEATURE_NAMES]
        y_class = df["risk_level"]
        y_score = df["risk_score"]
        y_window = df["warning_window_minutes"]

        logger.info("Training RandomForest Classifier and Regressors...")
        self.clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
        self.clf.fit(X, y_class)

        self.reg_score = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
        self.reg_score.fit(X, y_score)

        self.reg_window = RandomForestRegressor(n_estimators=60, max_depth=8, random_state=42, n_jobs=-1)
        self.reg_window.fit(X, y_window)

        # Store feature importances
        for feat, imp in zip(FEATURE_NAMES, self.reg_score.feature_importances_):
            self.feature_importances_[feat] = round(float(imp), 4)

        self.is_trained = True
        logger.info(f"Model successfully trained. Feature importances: {self.feature_importances_}")

    def predict_risk(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Wraps model inference:
        Returns:
            - risk_score: float (0 - 100)
            - risk_level: str ("NORMAL" | "WATCH" | "WARNING" | "CRITICAL")
            - warning_window_minutes: int
            - feature_contributions: Dict[str, float] (Percentage contributions summing to 100%)
        """
        if not self.is_trained:
            self.train()

        # Build feature row
        row = [float(features.get(k, 0.0)) for k in FEATURE_NAMES]
        X_test = pd.DataFrame([row], columns=FEATURE_NAMES)

        # Continuous risk score
        predicted_score = float(np.clip(self.reg_score.predict(X_test)[0], 0.0, 100.0))
        predicted_score = round(predicted_score, 1)

        # Discrete risk level
        if predicted_score < 35.0:
            risk_level = "NORMAL"
        elif predicted_score < 60.0:
            risk_level = "WATCH"
        elif predicted_score < 80.0:
            risk_level = "WARNING"
        else:
            risk_level = "CRITICAL"

        # Warning window
        predicted_window = int(np.clip(self.reg_window.predict(X_test)[0], 15, 720))

        # Calculate explainability feature contributions
        # Approximate contribution = feature_importance * relative activation
        contributions = {}
        normal_baselines = {
            "rainfall_1h": 5.0,
            "rainfall_3h": 15.0,
            "rainfall_6h": 25.0,
            "rainfall_24h": 40.0,
            "temperature": 20.0,
            "humidity": 60.0,
            "river_level": 3.0,
            "river_level_change_rate": 0.1,
            "soil_moisture": 35.0,
            "slope": 20.0,
            "elevation": 1500.0,
            "distance_from_river": 150.0,
            "forecast_rainfall_next_3h": 10.0
        }

        weights = {}
        for feat in FEATURE_NAMES:
            val = float(features.get(feat, normal_baselines[feat]))
            base = normal_baselines[feat]
            importance = self.feature_importances_.get(feat, 0.05)

            # Impact multiplier based on elevated values
            if feat in ["rainfall_1h", "rainfall_3h", "rainfall_6h", "rainfall_24h", "river_level_change_rate", "soil_moisture", "forecast_rainfall_next_3h"]:
                ratio = max(0.1, val / max(base, 0.01))
            elif feat == "slope":
                ratio = max(0.2, val / 30.0)
            elif feat == "distance_from_river":
                ratio = max(0.2, 100.0 / max(val, 10.0))
            else:
                ratio = 0.5

            weights[feat] = importance * ratio

        total_weight = sum(weights.values()) or 1.0
        for feat, w in weights.items():
            contributions[feat] = round((w / total_weight) * 100.0, 1)

        # Sort contributions descending
        sorted_contributions = dict(sorted(contributions.items(), key=lambda item: item[1], reverse=True))

        return {
            "risk_score": predicted_score,
            "risk_level": risk_level,
            "warning_window_minutes": predicted_window,
            "feature_contributions": sorted_contributions
        }

# Global Singleton Model Instance
flood_model = FloodRiskModel()
