import datetime as dt
import json
from pathlib import Path


DEFAULT_INPUT_JSON = Path(r"C:\Users\Vidhvat\Projects\rungun\timeline_bake.json")
DEFAULT_OUTPUT_JS = Path(r"timeline.json")
DATE_FORMAT = "%Y-%m-%d"
BAKE_UPPER_LIMIT_DATE: str | None = "2026-10-01"

DEFAULT_EXCLUDED_FLAGS = {"Checkpoint", "Energizes", "Fractures"}


def build_redacted_mapping(
    json_path: Path,
    upper_limit_date: str | None = None,
    excluded_flags: set[str] | None = None,
) -> dict[str, dict]:
    if excluded_flags is None:
        excluded_flags = set()

    with json_path.open("r", encoding="utf-8") as json_file:
        raw: dict[str, dict] = json.load(json_file)

    parsed_upper_limit: dt.date | None = None
    if upper_limit_date:
        parsed_upper_limit = dt.datetime.strptime(upper_limit_date, DATE_FORMAT).date()

    redacted: dict[str, dict] = {}
    for date, value in raw.items():
        if not date or not isinstance(value, dict):
            continue
        if parsed_upper_limit is not None:
            try:
                parsed_date = dt.datetime.strptime(date, DATE_FORMAT).date()
                if parsed_date > parsed_upper_limit:
                    continue
            except ValueError:
                continue
        entry = {}
        for k, v in value.items():
            if k == "IDs":
                continue
            if k == "Flags" and isinstance(v, list):
                v = [f for f in v if f not in excluded_flags]
                if not v:
                    continue
            entry[k] = v
        if entry:
            if list(entry.keys()) == ["Items"] and entry.get("Items") == 0:
                continue
            redacted[date] = entry
    return redacted


def write_js_object(mapping: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    mapping_json = json.dumps(mapping, ensure_ascii=False, separators=(",", ":"))

    with output_path.open("w", encoding="utf-8") as output_file:
        output_file.write(mapping_json)


def main() -> None:
    mapping = build_redacted_mapping(
        DEFAULT_INPUT_JSON, BAKE_UPPER_LIMIT_DATE, DEFAULT_EXCLUDED_FLAGS
    )
    write_js_object(mapping, DEFAULT_OUTPUT_JS)
    print(f"Wrote JS for {len(mapping)} dates to {DEFAULT_OUTPUT_JS}")


if __name__ == "__main__":
    main()
