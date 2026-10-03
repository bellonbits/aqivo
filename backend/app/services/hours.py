from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_LABELS = dict(zip(DAYS, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]))
DEFAULT_HOURS = {d: {"open": "09:00", "close": "18:00"} for d in DAYS[:6]} | {"sun": None}


def _t(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


def hours_for(hours: dict, d: date) -> tuple[time, time] | None:
    day = hours.get(DAYS[d.weekday()])
    if not day or not day.get("open") or not day.get("close"):
        return None
    o, c = _t(day["open"]), _t(day["close"])
    return (o, c) if o < c else None


def validate_hours(hours: dict) -> dict:
    out: dict = {}
    for d in DAYS:
        v = hours.get(d)
        if not v:
            out[d] = None
            continue
        o, c = v.get("open"), v.get("close")
        try:
            if _t(o) >= _t(c):
                raise ValueError
        except (ValueError, AttributeError, TypeError):
            raise ValueError(f"Invalid opening hours for {DAY_LABELS[d]}")
        out[d] = {"open": o, "close": c}
    return out


def is_open_now(hours: dict, tz_name: str) -> bool:
    now = datetime.now(ZoneInfo(tz_name))
    span = hours_for(hours, now.date())
    return bool(span and span[0] <= now.time() < span[1])


def hours_display(hours: dict) -> list[dict]:
    return [{"day": DAY_LABELS[d], "text": (f"{hours[d]['open']} – {hours[d]['close']}" if hours.get(d) else "Closed")}
            for d in DAYS]


def schema_org_hours(hours: dict) -> list[dict]:
    names = dict(zip(DAYS, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]))
    return [{"@type": "OpeningHoursSpecification", "dayOfWeek": names[d], "opens": hours[d]["open"],
             "closes": hours[d]["close"]} for d in DAYS if hours.get(d)]


def has_any_hours(hours: dict) -> bool:
    return any(hours.get(d) for d in DAYS)
