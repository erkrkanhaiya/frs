from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import Counter
from dateutil.parser import parse as parse_date
from dateutil.tz import tzlocal

def get_alert_stats(alerts: List[dict], days: Optional[int] = None) -> dict:
    """Generate statistics from alerts."""
    now = datetime.now(tzlocal())
    if days:
        cutoff = now - timedelta(days=days)
        alerts = [
            a for a in alerts 
            if parse_date(a['timestamp']).replace(tzinfo=tzlocal()) > cutoff
        ]
    
    if not alerts:
        return {
            "total_alerts": 0,
            "unique_people": 0,
            "alerts_by_person": {},
            "alerts_by_camera": {},
            "alerts_by_hour": {},
            "recent_trends": []
        }

    # Basic counts
    total_alerts = len(alerts)
    unique_people = len(set(a['name'] for a in alerts))
    
    # Alerts by person
    alerts_by_person = Counter(a['name'] for a in alerts)
    
    # Alerts by camera
    alerts_by_camera = Counter(str(a['camera_id']) for a in alerts)
    
    # Alerts by hour (last 24h by default)
    hour_counts = Counter()
    for alert in alerts:
        dt = parse_date(alert['timestamp']).replace(tzinfo=tzlocal())
        hour = dt.strftime('%H:00')
        hour_counts[hour] += 1
    
    # Recent trends (compare last two periods)
    if days:
        period = timedelta(days=days/2)
    else:
        period = timedelta(days=1)
    
    midpoint = now - period
    recent = sum(1 for a in alerts 
                if parse_date(a['timestamp']).replace(tzinfo=tzlocal()) > midpoint)
    previous = total_alerts - recent
    trend = (
        ((recent - previous) / previous * 100)
        if previous > 0 else 100
    )
    
    return {
        "total_alerts": total_alerts,
        "unique_people": unique_people,
        "alerts_by_person": dict(alerts_by_person.most_common()),
        "alerts_by_camera": dict(alerts_by_camera.most_common()),
        "alerts_by_hour": dict(sorted(hour_counts.items())),
        "recent_trends": [{
            "period": "last_period",
            "count": recent,
            "change_percent": trend
        }]
    }

def get_person_history(
    alerts: List[dict],
    name: str,
    days: Optional[int] = None
) -> dict:
    """Get detailed alert history for a specific person."""
    person_alerts = [a for a in alerts if a['name'] == name]
    if days:
        cutoff = datetime.now(tzlocal()) - timedelta(days=days)
        person_alerts = [
            a for a in person_alerts 
            if parse_date(a['timestamp']).replace(tzinfo=tzlocal()) > cutoff
        ]
    
    if not person_alerts:
        return {
            "name": name,
            "total_alerts": 0,
            "first_seen": None,
            "last_seen": None,
            "cameras_seen": [],
            "alert_times": []
        }
    
    # Sort by timestamp
    person_alerts.sort(key=lambda x: parse_date(x['timestamp']))
    
    return {
        "name": name,
        "total_alerts": len(person_alerts),
        "first_seen": person_alerts[0]['timestamp'],
        "last_seen": person_alerts[-1]['timestamp'],
        "cameras_seen": sorted(set(str(a['camera_id']) for a in person_alerts)),
        "alert_times": [a['timestamp'] for a in person_alerts]
    }